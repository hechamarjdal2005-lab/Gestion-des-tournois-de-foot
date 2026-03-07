from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import random, os, shutil, json
from datetime import datetime, timedelta, date
from app.database import get_db
from app.models.user import User
from app.models.tournament import (
    Tournament, Team, Coach, Match, Player, PlayerStat,
    Referee, Stadium, tournament_teams, MatchLineup, MatchEvent
)
from app.schemas.tournament import (
    TeamCreate, TournamentCreate, TournamentUpdate,
    StandingSchema, MatchCreate, MatchUpdate, PlayerCreateWithEmail, RefereeData
)
from app.routes.auth import get_current_user
from pydantic import BaseModel
from app.utils.security import get_password_hash, create_access_token
from app.utils.email_service import send_reset_email
from app.utils.email_service import send_invite_email_sync
import asyncio

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def check_role(user: User, allowed_roles: List[str]):
    if user.role not in allowed_roles and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="You do not have sufficient permissions.")


def create_user_and_send_invite(db: Session, name: str, email: str, role: str,
                                 team_id: Optional[int] = None, player_id: Optional[int] = None):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        temp_pass = "TempPass123!"
        user = User(name=name, email=email, hashed_password=get_password_hash(temp_pass),
                    role=role, is_active=True)
        db.add(user)
        db.commit()
        db.refresh(user)
        if role == "coach" and team_id:
            coach = Coach(name=name, email=email, team_id=team_id, user_id=user.id)
            db.add(coach)
            db.commit()
        elif role == "player" and player_id:
            player = db.query(Player).filter(Player.id == player_id).first()
            if player:
                player.user_id = user.id
                db.commit()
        elif role == "referee":
            ref = Referee(name=name, email=email, user_id=user.id)
            db.add(ref)
            db.commit()
        reset_token = create_access_token(
            data={"sub": user.email, "type": "reset", "role": role},
            expires_delta=timedelta(days=3)
        )
        print(f"\n📧 [NEW USER] Sending invite to: {email}")
        try:
            send_invite_email_sync(email, reset_token, name=name, role=role)
            print(f"✅ Email sent successfully")
        except Exception as e:
            print(f"❌ Email failed: {e}")
        return {"user_id": user.id, "temp_password": temp_pass, "is_new": True, "message": "User created and invite sent."}
    else:
        return {"user_id": user.id, "temp_password": None, "is_new": False, "message": "Email already in use."}


def save_uploaded_file(file: UploadFile, folder: str) -> str:
    file_path = os.path.join(UPLOAD_DIR, folder, file.filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return f"/{file_path}"


# ==========================================
# 1. Tournament Management
# ==========================================

@router.post("/tournaments", response_model=dict)
def create_tournament(t_data: TournamentCreate, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    team_ids = t_data.team_ids
    tournament_data = t_data.model_dump(exclude={'team_ids'})
    new_tournament = Tournament(**tournament_data)
    db.add(new_tournament)
    db.commit()
    db.refresh(new_tournament)
    if team_ids:
        for team_id in team_ids:
            team = db.query(Team).filter(Team.id == team_id).first()
            if team:
                new_tournament.teams.append(team)
        db.commit()
    return {"message": "Tournament created successfully.", "id": new_tournament.id}


@router.put("/tournaments/{t_id}")
def update_tournament_details(t_id: int, data: TournamentUpdate, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "Tournament not found.")
    if data.trophy_image is not None:
        tournament.trophy_image = data.trophy_image
    if data.name is not None:
        tournament.name = data.name
    db.commit()
    return {"message": "Tournament updated successfully."}


@router.delete("/tournaments/{t_id}", response_model=dict)
def delete_tournament(t_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "Tournament not found.")
    db.query(Match).filter(Match.tournament_id == t_id).delete(synchronize_session=False)
    tournament.teams = []
    db.delete(tournament)
    db.commit()
    return {"message": "Tournament deleted successfully."}


@router.get("/tournaments", response_model=List[dict])
def get_tournaments(db: Session = Depends(get_db)):
    tournaments = db.query(Tournament).all()
    return [
        {
            "id": t.id, "name": t.name, "type": t.type,
            "start_date": str(t.start_date), "end_date": str(t.end_date),
            "is_active": t.is_active, "trophy_image": t.trophy_image,
            "teams_count": len(t.teams)
        }
        for t in tournaments
    ]


@router.get("/tournaments/{t_id}", response_model=dict)
def get_tournament_details(t_id: int, db: Session = Depends(get_db)):
    t = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not t:
        raise HTTPException(404, "Tournament not found.")

    # Detect knockout stage legs from existing matches
    ko_matches_check = [m for m in t.matches if not m.group_name]
    has_two_legs = any(m.leg_number == 2 for m in ko_matches_check)
    ko_legs_detected = 2 if has_two_legs else 1

    return {
        "id": t.id, "name": t.name, "type": t.type, "trophy_image": t.trophy_image,
        "knockout_stage_legs": ko_legs_detected,
        "teams": [
            {
                "id": team.id,
                "name": team.name,
                "logo": team.logo,
                "group_name": next(
                    (m.group_name for m in t.matches
                     if m.group_name and (m.home_team_id == team.id or m.away_team_id == team.id)),
                    None
                )
            }
            for team in t.teams
        ],
        "matches": [
            {
                "id": m.id,
                "home": m.home_team.name if m.home_team else "TBD",
                "away": m.away_team.name if m.away_team else "TBD",
                "home_team_id": m.home_team_id,
                "away_team_id": m.away_team_id,
                "score_home": m.score_home,
                "score_away": m.score_away,
                "status": m.status,
                "date": str(m.match_date),
                "round_number": m.round_number,
                "group_name": m.group_name,
                "referee_id": m.referee_id,
                "referee_name": m.referee.name if m.referee else None,
                "leg_number": m.leg_number,
                "penalty_home": m.penalty_home,
                "penalty_away": m.penalty_away,
                "referee_report": getattr(m, "referee_report", None),
            }
            for m in t.matches
        ]
    }


class MatchGenerationConfig(BaseModel):
    group_stage_legs: int = 1
    knockout_stage_legs: int = 1
    num_groups: Optional[int] = None
    teams_qualify_per_group: Optional[int] = 2


@router.post("/tournaments/{t_id}/generate-matches", response_model=dict)
def generate_matches(
    t_id: int,
    config: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "Tournament not found.")

    teams = list(tournament.teams)
    num_teams = len(teams)
    if num_teams < 2:
        raise HTTPException(400, "At least 2 teams are required.")

    # Delete existing matches
    db.query(Match).filter(Match.tournament_id == t_id).delete(synchronize_session=False)

    start_date = tournament.start_date
    end_date = tournament.end_date
    total_days = max((end_date - start_date).days, 1)

    group_legs = int(config.get('group_stage_legs', 1))
    ko_legs = int(config.get('knockout_stage_legs', 1))
    num_groups = int(config.get('num_groups', 2))
    qualify_per_group = int(config.get('teams_qualify_per_group', 2))
    t_type = tournament.type

    # ==============================
    # 1. League System (Round-Robin)
    # ==============================
    if t_type == "league":
        if num_teams % 2 != 0:
            teams.append(None)
            num_teams += 1

        rounds_per_leg = num_teams - 1
        total_rounds = rounds_per_leg * group_legs
        days_per_round = max(1, total_days // total_rounds)

        for leg in range(group_legs):
            is_second_leg = (leg % 2 == 1)
            leg_teams = teams[:]
            for r in range(rounds_per_leg):
                round_num = r + 1 + (leg * rounds_per_leg)
                match_date = start_date + timedelta(days=(round_num - 1) * days_per_round)

                for i in range(num_teams // 2):
                    home = leg_teams[i]
                    away = leg_teams[num_teams - 1 - i]
                    if is_second_leg:
                        home, away = away, home
                    if home and away:
                        db.add(Match(
                            tournament_id=t_id,
                            home_team_id=home.id,
                            away_team_id=away.id,
                            match_date=match_date,
                            status="scheduled",
                            round_number=str(round_num),
                            leg_number=leg + 1,
                            group_name=None
                        ))

                # Round-robin rotation algorithm
                leg_teams.insert(1, leg_teams.pop())

        db.commit()
        return {"message": f"League schedule generated ({group_legs} leg(s))."}

    # ==============================
    # 2. Knockout System
    # Rules:
    #   - ko_legs=1 → single match per pair
    #   - ko_legs=2 → home & away per pair (final always single match)
    #   - First round: real teams
    #   - Later rounds: empty placeholders filled by advance-round
    # ==============================
    elif t_type == "knockout":
        if num_teams & (num_teams - 1) != 0:
            raise HTTPException(
                400,
                f"Number of teams ({num_teams}) must be a power of 2 (2, 4, 8, 16...)"
            )

        random.shuffle(teams)
        match_date = start_date
        round_num = 1
        current_count = num_teams

        while current_count >= 2:
            matches_in_round = current_count // 2
            is_first_round = (round_num == 1)

            # Final is always a single match even if ko_legs=2
            is_final = (current_count == 2)
            legs_this_round = 1 if is_final else ko_legs

            for i in range(matches_in_round):
                for leg in range(legs_this_round):
                    leg_date = match_date + timedelta(days=leg * 7)

                    if is_first_round:
                        t1 = teams[i * 2]
                        t2 = teams[i * 2 + 1]
                        # Second leg: swap home/away
                        h_team = t2 if (leg == 1) else t1
                        a_team = t1 if (leg == 1) else t2
                        db.add(Match(
                            tournament_id=t_id,
                            home_team_id=h_team.id,
                            away_team_id=a_team.id,
                            match_date=leg_date,
                            status="scheduled",
                            round_number=f"KO_R{round_num}",
                            leg_number=leg + 1,
                            group_name=None
                        ))
                    else:
                        # Empty placeholder for future rounds
                        db.add(Match(
                            tournament_id=t_id,
                            home_team_id=None,
                            away_team_id=None,
                            match_date=leg_date,
                            status="scheduled",
                            round_number=f"KO_R{round_num}",
                            leg_number=leg + 1,
                            group_name=None
                        ))

            match_date += timedelta(days=14)
            current_count = current_count // 2
            round_num += 1

        db.commit()
        legs_label = "home & away (final is single match)" if ko_legs == 2 else "single match per pair"
        return {"message": f"Knockout bracket generated — {round_num - 1} rounds — {legs_label}"}

    # ==============================
    # 3. Mixed System (Group Stage + Knockout)
    # ==============================
    elif t_type == "mixed":
        if num_teams % num_groups != 0:
            raise HTTPException(400, f"Number of teams ({num_teams}) must be divisible by number of groups ({num_groups}).")

        group_size = num_teams // num_groups
        random.shuffle(teams)

        # --- Group Stage ---
        for g_idx in range(num_groups):
            group_letter = chr(65 + g_idx)
            group_name = f"Group {group_letter}"
            local_teams = teams[g_idx * group_size: (g_idx + 1) * group_size]

            if len(local_teams) % 2 != 0:
                local_teams.append(None)

            local_num = len(local_teams)
            rounds_per_leg = local_num - 1
            total_group_rounds = rounds_per_leg * group_legs
            days_per_round = max(1, (total_days // 2) // max(total_group_rounds, 1))

            for leg in range(group_legs):
                is_second_leg = (leg % 2 == 1)
                leg_local = local_teams[:]
                for r in range(rounds_per_leg):
                    round_num_g = r + 1 + (leg * rounds_per_leg)
                    m_date = start_date + timedelta(days=(round_num_g - 1) * days_per_round)

                    for i in range(local_num // 2):
                        h = leg_local[i]
                        a = leg_local[local_num - 1 - i]
                        if is_second_leg:
                            h, a = a, h
                        if h and a:
                            db.add(Match(
                                tournament_id=t_id,
                                home_team_id=h.id,
                                away_team_id=a.id,
                                match_date=m_date,
                                status="scheduled",
                                group_name=group_name,
                                round_number=f"G{group_letter}_R{round_num_g}",
                                leg_number=leg + 1
                            ))

                    leg_local.insert(1, leg_local.pop())

        # --- Knockout Stage (empty placeholders) ---
        qualified_slots = num_groups * qualify_per_group
        ko_slots = 1
        while ko_slots < qualified_slots:
            ko_slots *= 2

        ko_start_date = start_date + timedelta(days=total_days // 2 + 7)
        current_ko_count = ko_slots
        ko_round_idx = 1

        while current_ko_count >= 2:
            match_count = current_ko_count // 2
            # Final is always a single match
            is_ko_final = (current_ko_count == 2)
            legs_this_ko_round = 1 if is_ko_final else ko_legs

            for i in range(match_count):
                for leg in range(legs_this_ko_round):
                    db.add(Match(
                        tournament_id=t_id,
                        home_team_id=None,
                        away_team_id=None,
                        match_date=ko_start_date + timedelta(days=leg * 7),
                        status="scheduled",
                        group_name=None,
                        round_number=f"KO_R{ko_round_idx}",
                        leg_number=leg + 1
                    ))
            ko_start_date += timedelta(days=14)
            current_ko_count //= 2
            ko_round_idx += 1

        db.commit()
        return {
            "message": f"Generated: {num_groups} groups + {ko_round_idx - 1} knockout rounds ({ko_legs} match(es) per pair)"
        }

    else:
        raise HTTPException(400, "Unknown tournament type.")


# ==========================================
# Advance Knockout Round
# Supports two-leg ties (aggregate goals)
# ==========================================
@router.post("/tournaments/{t_id}/advance-round", response_model=dict)
def advance_knockout_round(
    t_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "Tournament not found.")

    if tournament.type not in ["knockout", "mixed"]:
        raise HTTPException(400, "This operation is only for knockout/mixed tournaments.")

    all_matches = db.query(Match).filter(Match.tournament_id == t_id).all()
    if not all_matches:
        raise HTTPException(400, "No matches found.")

    ko_matches = [m for m in all_matches if not m.group_name]
    if not ko_matches:
        if tournament.type == "mixed":
            raise HTTPException(400, "Knockout rounds have not been generated yet.")
        raise HTTPException(400, "No knockout rounds found.")

    def get_round_index(r_key: str) -> int:
        s = str(r_key).strip()
        if "KO_R" in s:
            try: return int(s.replace("KO_R", ""))
            except: return 9999
        if s.startswith("R"):
            try: return int(s[1:])
            except: return 9999
        try: return int(s)
        except: return 9999

    round_keys = sorted(
        list(set(str(m.round_number) for m in ko_matches if m.round_number)),
        key=get_round_index
    )

    if not round_keys:
        raise HTTPException(400, "No rounds defined.")

    # ===================================================
    # Calculate winner for a two-legged tie
    # Logic: sum goals for each team across both legs
    # Example: Barcelona 2-1 Liverpool (leg 1) + Liverpool 2-0 Barcelona (leg 2)
    #   → Barcelona: 2+0=2 goals | Liverpool: 1+2=3 goals → Liverpool advances
    # ===================================================
    def get_tie_winner(tie_matches: list) -> Optional[int]:
        """
        tie_matches: list of matches for the same pair (leg 1 + leg 2)
        Returns the winning team id, or None if aggregate is level.
        """
        if not tie_matches:
            return None

        goals_per_team: dict = {}

        for m in tie_matches:
            if m.home_team_id not in goals_per_team:
                goals_per_team[m.home_team_id] = 0
            if m.away_team_id not in goals_per_team:
                goals_per_team[m.away_team_id] = 0
            goals_per_team[m.home_team_id] += m.score_home
            goals_per_team[m.away_team_id] += m.score_away

        teams_in_tie = list(goals_per_team.keys())
        if len(teams_in_tie) != 2:
            return None

        t1, t2 = teams_in_tie[0], teams_in_tie[1]
        g1, g2 = goals_per_team[t1], goals_per_team[t2]

        if g1 > g2:
            return t1
        elif g2 > g1:
            return t2
        else:
            # Aggregate level → penalty shootout required
            return None

    # ===================================================
    # Find the current completed round and the next empty round
    # ===================================================
    found_current = None
    found_next = None

    for i, r_key in enumerate(round_keys):
        round_matches = [m for m in ko_matches if str(m.round_number) == r_key]
        real_matches = [m for m in round_matches if m.home_team_id is not None]

        # Skip fully empty rounds
        if not real_matches:
            continue

        # Check if all matches in this round are finished
        unfinished = [m for m in real_matches if m.status != 'finished']
        if unfinished:
            raise HTTPException(
                400,
                f"⚠️ Not all matches in round {r_key} are finished. "
                f"({len(real_matches) - len(unfinished)}/{len(real_matches)} done)"
            )

        # Round complete → find next empty round
        if i + 1 >= len(round_keys):
            break

        next_key = round_keys[i + 1]
        next_matches_check = [m for m in ko_matches if str(m.round_number) == next_key]
        next_is_empty = all(m.home_team_id is None for m in next_matches_check)

        if next_is_empty:
            found_current = r_key
            found_next = next_key
            break

    # ===================================================
    # Check if the tournament is already finished
    # ===================================================
    if not found_current:
        last_key = round_keys[-1]
        last_real = [m for m in ko_matches if str(m.round_number) == last_key and m.home_team_id]
        if last_real and all(m.status == 'finished' for m in last_real):

            ko_legs_final = max((m.leg_number or 1) for m in last_real)

            if ko_legs_final > 1:
                sorted_final = sorted(last_real, key=lambda x: x.id)
                winner_id = get_tie_winner(sorted_final)
                if winner_id is None:
                    return {"message": "🏆 Tournament over! The final ended level (penalty shootout)."}
            else:
                final_match = sorted(last_real, key=lambda x: x.id)[-1]
                if final_match.score_home > final_match.score_away:
                    winner_id = final_match.home_team_id
                elif final_match.score_away > final_match.score_home:
                    winner_id = final_match.away_team_id
                else:
                    return {"message": "🏆 Tournament over! The final ended in a draw."}

            winner_team = db.query(Team).filter(Team.id == winner_id).first()
            winner_name = winner_team.name if winner_team else "The winner"
            return {"message": f"🏆 Tournament finished! Champion: {winner_name} 🎉"}

        raise HTTPException(400, "No completed round ready to advance. Make sure all results are entered first.")

    # ===================================================
    # Move winners to the next round
    # ===================================================
    current_real = sorted(
        [m for m in ko_matches if str(m.round_number) == found_current and m.home_team_id],
        key=lambda x: x.id
    )
    next_matches = sorted(
        [m for m in ko_matches if str(m.round_number) == found_next],
        key=lambda x: x.id
    )

    # Determine number of legs in current and next round
    ko_legs_current = max((m.leg_number or 1) for m in current_real)
    num_pairs = len(current_real) // ko_legs_current
    ko_legs_next = max((m.leg_number or 1) for m in next_matches) if next_matches else 1

    # ===================================================
    # Calculate winner for each pair
    # ===================================================
    winners = []

    for pair_idx in range(num_pairs):
        pair_start = pair_idx * ko_legs_current
        pair_end = pair_start + ko_legs_current
        pair_matches = current_real[pair_start:pair_end]

        if ko_legs_current == 1:
            # Single match — direct winner
            m = pair_matches[0]
            if m.score_home > m.score_away:
                winners.append(m.home_team_id)
            elif m.score_away > m.score_home:
                winners.append(m.away_team_id)
            else:
                # Draw → check penalty shootout
                if m.penalty_home is not None and m.penalty_away is not None:
                    if m.penalty_home > m.penalty_away:
                        winners.append(m.home_team_id)
                    elif m.penalty_away > m.penalty_home:
                        winners.append(m.away_team_id)
                    else:
                        raise HTTPException(400, "⚠️ Draw even in penalties! Please review the result.")
                else:
                    home_name = m.home_team.name if m.home_team else "?"
                    away_name = m.away_team.name if m.away_team else "?"
                    raise HTTPException(
                        400,
                        f"⚠️ Match between {home_name} and {away_name} ended in a draw! "
                        f"Please enter penalty shootout scores and try again."
                    )
        else:
            # Two legs — aggregate goal calculation
            winner_id = get_tie_winner(pair_matches)

            if winner_id is None:
                # Aggregate level → check penalties in the second leg
                last_match = pair_matches[-1]
                if last_match.penalty_home is not None and last_match.penalty_away is not None:
                    if last_match.penalty_home > last_match.penalty_away:
                        winner_id = last_match.home_team_id
                    elif last_match.penalty_away > last_match.penalty_home:
                        winner_id = last_match.away_team_id
                    else:
                        raise HTTPException(400, "⚠️ Draw even in penalties! Please review the result.")
                else:
                    goals_info = {}
                    for m in pair_matches:
                        goals_info[m.home_team_id] = goals_info.get(m.home_team_id, 0) + m.score_home
                        goals_info[m.away_team_id] = goals_info.get(m.away_team_id, 0) + m.score_away
                    t1, t2 = list(goals_info.keys())
                    n1 = db.query(Team).filter(Team.id == t1).first()
                    n2 = db.query(Team).filter(Team.id == t2).first()
                    raise HTTPException(
                        400,
                        f"⚠️ Aggregate draw {goals_info[t1]}-{goals_info[t2]} between "
                        f"{n1.name if n1 else t1} and {n2.name if n2 else t2}! "
                        f"Please enter penalty shootout scores in the second leg and try again."
                    )

            winners.append(winner_id)

    if not winners:
        raise HTTPException(400, "No winners to advance.")

    # ===================================================
    # Distribute winners into next round matches
    # Winner 1 + Winner 2 → Match 1 of next round, etc.
    # ===================================================
    next_num_pairs = len(winners) // 2

    for pair_idx in range(next_num_pairs):
        w1 = winners[pair_idx * 2]
        w2 = winners[pair_idx * 2 + 1]

        pair_start = pair_idx * ko_legs_next
        pair_end = pair_start + ko_legs_next
        pair_next_matches = next_matches[pair_start:pair_end]

        for leg_i, nm in enumerate(pair_next_matches):
            if leg_i == 0:  # First leg
                nm.home_team_id = w1
                nm.away_team_id = w2
            else:           # Second leg — swap home/away
                nm.home_team_id = w2
                nm.away_team_id = w1
            nm.status = "scheduled"
            nm.score_home = 0
            nm.score_away = 0

    db.commit()

    winner_names = []
    for wid in winners:
        wt = db.query(Team).filter(Team.id == wid).first()
        if wt:
            winner_names.append(wt.name)

    mode_label = "on aggregate" if ko_legs_current > 1 else "by match result"
    return {
        "message": f"✅ Teams advanced {mode_label}: {', '.join(winner_names)} → moved to {found_next}"
    }


def _get_group_standings(tournament, db: Session):
    group_matches = [m for m in tournament.matches if m.group_name and m.status == 'finished']
    if not group_matches:
        return {}

    table = {}
    for team in tournament.teams:
        table[team.id] = {
            "id": team.id, "name": team.name,
            "points": 0, "gd": 0, "gf": 0, "played": 0,
            "group": None
        }

    for m in group_matches:
        if not m.home_team_id or not m.away_team_id:
            continue
        home = table.get(m.home_team_id)
        away = table.get(m.away_team_id)
        if not home or not away:
            continue

        home["group"] = m.group_name
        away["group"] = m.group_name
        home["played"] += 1
        away["played"] += 1
        home["gf"] += m.score_home
        home["gd"] += m.score_home - m.score_away
        away["gf"] += m.score_away
        away["gd"] += m.score_away - m.score_home

        if m.score_home > m.score_away:
            home["points"] += 3
        elif m.score_away > m.score_home:
            away["points"] += 3
        else:
            home["points"] += 1
            away["points"] += 1

    groups = {}
    for team_data in table.values():
        if team_data["group"]:
            g = team_data["group"]
            if g not in groups:
                groups[g] = []
            groups[g].append(team_data)

    for g in groups:
        groups[g].sort(key=lambda x: (x["points"], x["gd"], x["gf"]), reverse=True)

    return groups


@router.get("/tournaments/{t_id}/standings", response_model=List[dict])
def get_tournament_standings(t_id: int, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament or tournament.type != "league":
        return []
    standings = {}
    for team in tournament.teams:
        standings[team.id] = {
            "id": team.id, "name": team.name, "logo": team.logo,
            "played": 0, "won": 0, "drawn": 0, "lost": 0,
            "gf": 0, "ga": 0, "gd": 0, "points": 0
        }
    matches = db.query(Match).filter(Match.tournament_id == t_id, Match.status == "finished").all()
    for m in matches:
        if m.home_team_id not in standings or m.away_team_id not in standings:
            continue
        home, away = standings[m.home_team_id], standings[m.away_team_id]
        home["played"] += 1
        away["played"] += 1
        home["gf"] += m.score_home
        home["ga"] += m.score_away
        away["gf"] += m.score_away
        away["ga"] += m.score_home
        if m.score_home > m.score_away:
            home["won"] += 1
            home["points"] += 3
            away["lost"] += 1
        elif m.score_home < m.score_away:
            away["won"] += 1
            away["points"] += 3
            home["lost"] += 1
        else:
            home["drawn"] += 1
            home["points"] += 1
            away["drawn"] += 1
            away["points"] += 1
        home["gd"] = home["gf"] - home["ga"]
        away["gd"] = away["gf"] - away["ga"]
    return sorted(standings.values(), key=lambda x: (x["points"], x["gd"], x["gf"]), reverse=True)


@router.post("/tournaments/{t_id}/next-round", response_model=dict)
def next_round_action(t_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "Tournament not found.")
    if tournament.type == "league":
        all_matches = db.query(Match).filter(Match.tournament_id == t_id).all()
        if not all_matches:
            raise HTTPException(400, "No matches found.")
        round_nums = sorted(set(int(m.round_number) for m in all_matches
                                if m.round_number and str(m.round_number).isdigit()))
        for r in round_nums:
            if any(m.status != "finished" for m in all_matches if str(m.round_number) == str(r)):
                unfinished = [m for m in all_matches
                               if str(m.round_number) == str(r) and m.status != "finished"]
                raise HTTPException(400, f"{len(unfinished)} match(es) still unfinished in round {r}.")
        return {"message": "✅ Tournament complete!"}
    elif tournament.type in ["knockout", "mixed"]:
        return advance_knockout_round(t_id, db, current_user)
    return {"message": "Done."}


# ==========================================
# 2. Match Management
# ==========================================

class MatchUpdatePayload(BaseModel):
    referee_id: Optional[int] = None
    score_home: Optional[int] = None
    score_away: Optional[int] = None
    status: Optional[str] = None
    penalty_home: Optional[int] = None   # Penalty shootout home score
    penalty_away: Optional[int] = None   # Penalty shootout away score


@router.post("/matches/update-details", response_model=dict)
def update_match_details(
    match_id: int = Query(...),
    payload: MatchUpdatePayload = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["super_admin", "referee"])
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    if not payload:
        raise HTTPException(status_code=400, detail="No data provided.")

    if payload.referee_id:
        match.referee_id = payload.referee_id

    if payload.status == "finished":
        if not match.referee_id:
            raise HTTPException(
                status_code=400,
                detail="⚠️ A referee must be assigned before finishing the match!"
            )

    if payload.score_home is not None:
        match.score_home = payload.score_home
    if payload.score_away is not None:
        match.score_away = payload.score_away
    if payload.status:
        match.status = payload.status
    if payload.penalty_home is not None:
        match.penalty_home = payload.penalty_home
    if payload.penalty_away is not None:
        match.penalty_away = payload.penalty_away

    db.commit()
    db.refresh(match)

    return {
        "message": "Match updated successfully.",
        "score": f"{match.score_home} - {match.score_away}",
        "penalty": f"{match.penalty_home} - {match.penalty_away}" if match.penalty_home is not None else None,
        "status": match.status,
        "referee_id": match.referee_id
    }


@router.post("/matches/{match_id}/lineup", response_model=dict)
def submit_lineup(
    match_id: int,
    formation: str = Form(...),
    player_ids: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    team_id = None
    if current_user.role == "team_manager":
        t = db.query(Team).filter(Team.manager_id == current_user.id).first()
        if t:
            team_id = t.id
    elif current_user.role == "coach":
        cp = db.query(Coach).filter(Coach.user_id == current_user.id).first()
        if cp:
            team_id = cp.team_id

    if not team_id:
        raise HTTPException(403, "You are not authorized to submit a lineup.")

    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(404, "Match not found.")

    if team_id not in [match.home_team_id, match.away_team_id]:
        raise HTTPException(400, "This team is not participating in this match.")

    lineup = db.query(MatchLineup).filter(
        MatchLineup.match_id == match_id, MatchLineup.team_id == team_id
    ).first()

    if not lineup:
        lineup = MatchLineup(
            match_id=match_id, team_id=team_id, formation=formation,
            player_ids_json=player_ids, is_submitted=True, submitted_at=datetime.now()
        )
        db.add(lineup)
    else:
        lineup.formation = formation
        lineup.player_ids_json = player_ids
        lineup.is_submitted = True
        lineup.submitted_at = datetime.now()

    db.commit()

    home_lineup = db.query(MatchLineup).filter(
        MatchLineup.match_id == match_id, MatchLineup.team_id == match.home_team_id
    ).first()
    away_lineup = db.query(MatchLineup).filter(
        MatchLineup.match_id == match_id, MatchLineup.team_id == match.away_team_id
    ).first()

    both_submitted = (
        (home_lineup and home_lineup.is_submitted) and
        (away_lineup and away_lineup.is_submitted)
    )

    if both_submitted and match.status == "scheduled":
        match.status = "lineup_submitted"
        db.commit()

    return {"message": "Lineup submitted successfully.", "ready_to_play": both_submitted, "formation": formation}


@router.get("/matches/{match_id}/lineups", response_model=dict)
def get_match_lineups(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(404, "Match not found.")

    home_lineup_data = db.query(MatchLineup).filter(
        MatchLineup.match_id == match_id, MatchLineup.team_id == match.home_team_id
    ).first()
    away_lineup_data = db.query(MatchLineup).filter(
        MatchLineup.match_id == match_id, MatchLineup.team_id == match.away_team_id
    ).first()

    def get_players_details(player_ids_json):
        if not player_ids_json:
            return []
        try:
            ids = json.loads(player_ids_json)
            players = db.query(Player).filter(Player.id.in_(ids)).all()
            return [{"id": p.id, "name": p.name, "number": p.jersey_number, "position": p.position}
                    for p in players]
        except:
            return []

    return {
        "match": {
            "id": match.id,
            "home": match.home_team.name,
            "away": match.away_team.name,
            "home_team_id": match.home_team_id,
            "away_team_id": match.away_team_id,
            "score_home": match.score_home,
            "score_away": match.score_away,
            "status": match.status
        },
        "home_lineup": get_players_details(home_lineup_data.player_ids_json) if home_lineup_data else [],
        "away_lineup": get_players_details(away_lineup_data.player_ids_json) if away_lineup_data else [],
        "events": [
            {
                "id": e.id, "minute": e.minute, "type": e.event_type,
                "player": e.player.name if e.player else "Unknown",
                "team_id": e.team_id,
                "icon": "⚽" if e.event_type == 'goal' else "🟨"
            }
            for e in match.events
        ]
    }


@router.post("/matches/{match_id}/record-event", response_model=dict)
def record_match_event(
    match_id: int,
    team_id: int = Form(...),
    player_id: int = Form(...),
    event_type: str = Form(...),
    minute: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["super_admin", "referee"])
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(404, "Match not found.")

    # Prevent exceeding the recorded score
    if event_type in ('goal', 'own_goal'):
        existing = db.query(MatchEvent).filter(MatchEvent.match_id == match_id).all()
        h_id, a_id = match.home_team_id, match.away_team_id
        goals_h = sum(1 for e in existing if (e.event_type == 'goal' and e.team_id == h_id) or (e.event_type == 'own_goal' and e.team_id == a_id))
        goals_a = sum(1 for e in existing if (e.event_type == 'goal' and e.team_id == a_id) or (e.event_type == 'own_goal' and e.team_id == h_id))
        max_h, max_a = (match.score_home or 0), (match.score_away or 0)

        if event_type == 'goal':
            if team_id == h_id and goals_h >= max_h:
                raise HTTPException(400, f"⚠️ Maximum goals reached ({max_h}). Update the score from the tournament page.")
            if team_id == a_id and goals_a >= max_a:
                raise HTTPException(400, f"⚠️ Maximum goals reached ({max_a}). Update the score from the tournament page.")
        elif event_type == 'own_goal':
            if team_id == h_id and goals_a >= max_a:
                raise HTTPException(400, f"⚠️ Maximum own goals reached ({max_a}).")
            if team_id == a_id and goals_h >= max_h:
                raise HTTPException(400, f"⚠️ Maximum own goals reached ({max_h}).")

    try:
        db.add(MatchEvent(match_id=match_id, team_id=team_id, player_id=player_id,
                          event_type=event_type, minute=int(minute)))
        if match.status in ("scheduled", "lineup_submitted"):
            match.status = "live"
        db.commit()
        return {"message": "Event recorded successfully.", "current_score": f"{match.score_home} - {match.score_away}", "status": match.status}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Internal error: {str(e)}")


@router.get("/tournaments/{t_id}/statistics", response_model=dict)
def get_tournament_statistics(t_id: int, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "Tournament not found.")

    matches = db.query(Match).filter(Match.tournament_id == t_id).all()
    finished_matches = [m for m in matches if m.status == 'finished']

    match_ids = [m.id for m in finished_matches]
    all_events = db.query(MatchEvent).filter(MatchEvent.match_id.in_(match_ids)).all() if match_ids else []

    # Build per-player stats
    player_stats = {}
    for ev in all_events:
        pid = ev.player_id
        if not pid:
            continue
        if pid not in player_stats:
            p = db.query(Player).filter(Player.id == pid).first()
            t = db.query(Team).filter(Team.id == ev.team_id).first()
            player_stats[pid] = {
                "player": p.name if p else "Unknown",
                "team": t.name if t else "Unknown",
                "team_id": ev.team_id,
                "photo": p.photo if p else None,
                "jersey_number": p.jersey_number if p else None,
                "position": p.position if p else None,
                "goals": 0, "assists": 0,
                "yellow_cards": 0, "red_cards": 0,
                "own_goals": 0, "matches": set(),
            }
        player_stats[pid]["matches"].add(ev.match_id)
        if ev.event_type == 'goal':          player_stats[pid]["goals"] += 1
        elif ev.event_type == 'assist':      player_stats[pid]["assists"] += 1
        elif ev.event_type == 'yellow_card': player_stats[pid]["yellow_cards"] += 1
        elif ev.event_type == 'red_card':    player_stats[pid]["red_cards"] += 1
        elif ev.event_type == 'own_goal':    player_stats[pid]["own_goals"] += 1

    player_list = []
    for pid, data in player_stats.items():
        data["matches"] = len(data["matches"])
        player_list.append(data)

    # Team standings table
    team_table = {}
    for team in tournament.teams:
        team_table[team.id] = {
            "name": team.name, "logo": team.logo,
            "played": 0, "won": 0, "drawn": 0, "lost": 0,
            "gf": 0, "ga": 0, "gd": 0, "points": 0,
        }
    for m in finished_matches:
        if not m.home_team_id or not m.away_team_id:
            continue
        h = team_table.get(m.home_team_id)
        a = team_table.get(m.away_team_id)
        if not h or not a:
            continue
        h["played"] += 1; a["played"] += 1
        h["gf"] += m.score_home; h["ga"] += m.score_away
        a["gf"] += m.score_away; a["ga"] += m.score_home
        if m.score_home > m.score_away:
            h["won"] += 1; h["points"] += 3; a["lost"] += 1
        elif m.score_away > m.score_home:
            a["won"] += 1; a["points"] += 3; h["lost"] += 1
        else:
            h["drawn"] += 1; h["points"] += 1
            a["drawn"] += 1; a["points"] += 1
    for t in team_table.values():
        t["gd"] = t["gf"] - t["ga"]

    standings = sorted(team_table.values(), key=lambda x: (x["points"], x["gd"], x["gf"]), reverse=True)

    # Match outcome breakdown
    home_wins = sum(1 for m in finished_matches if m.score_home > m.score_away)
    away_wins = sum(1 for m in finished_matches if m.score_away > m.score_home)
    draws     = sum(1 for m in finished_matches if m.score_home == m.score_away)

    # Goals per round
    round_goals = {}
    for m in finished_matches:
        r = str(m.round_number or 'N/A')
        if r not in round_goals:
            round_goals[r] = 0
        round_goals[r] += (m.score_home or 0) + (m.score_away or 0)
    round_goals_list = [{"round": k, "goals": v} for k, v in sorted(round_goals.items())]

    # Cards per team
    team_cards = {}
    for ev in all_events:
        if ev.event_type not in ('yellow_card', 'red_card'):
            continue
        tid = ev.team_id
        if tid not in team_cards:
            t = db.query(Team).filter(Team.id == tid).first()
            team_cards[tid] = {"team": t.name if t else "Unknown", "yellow": 0, "red": 0}
        if ev.event_type == 'yellow_card': team_cards[tid]["yellow"] += 1
        else: team_cards[tid]["red"] += 1
    team_cards_list = sorted(team_cards.values(), key=lambda x: x["yellow"] + x["red"] * 3, reverse=True)

    total_goals = sum((m.score_home or 0) + (m.score_away or 0) for m in finished_matches)

    return {
        "tournament_name": tournament.name,
        "tournament_type": tournament.type,
        "total_matches": len(matches),
        "finished_matches": len(finished_matches),
        "total_goals": total_goals,
        "avg_goals_per_match": round(total_goals / len(finished_matches), 2) if finished_matches else 0,
        "match_outcomes": [
            {"name": "Home Win", "value": home_wins},
            {"name": "Draw",     "value": draws},
            {"name": "Away Win", "value": away_wins},
        ],
        "top_scorers":  sorted(player_list, key=lambda x: x["goals"],   reverse=True)[:10],
        "top_assists":  sorted(player_list, key=lambda x: x["assists"],  reverse=True)[:10],
        "most_carded":  sorted(player_list, key=lambda x: x["yellow_cards"] + x["red_cards"] * 3, reverse=True)[:10],
        "standings":    standings,
        "round_goals":  round_goals_list,
        "team_cards":   team_cards_list,
        "all_players":  sorted(player_list, key=lambda x: x["goals"], reverse=True),
    }


@router.delete("/events/{event_id}", response_model=dict)
def delete_match_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["super_admin", "referee"])
    event = db.query(MatchEvent).filter(MatchEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    db.delete(event)
    db.commit()
    return {"message": "Event deleted successfully.", "event_id": event_id}


# ==========================================
# 3. Team & Player Management
# ==========================================

@router.post("/teams", response_model=dict)
def create_team(
    name: str = Form(...), short_name: str = Form(None), founded_date: str = Form(None),
    colors: str = Form(None), manager_name: str = Form(...), manager_email: str = Form(...),
    coach_name: str = Form(...), coach_email: str = Form(...),
    logo: UploadFile = File(None),
    coach_photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["super_admin"])
    logo_path = None
    if logo and logo.filename:
        logo_path = save_uploaded_file(logo, "teams")
    parsed_founded_date = None
    if founded_date and founded_date.strip():
        try:
            parsed_founded_date = datetime.strptime(founded_date, "%Y-%m-%d").date()
        except ValueError:
            parsed_founded_date = None
    manager_result = create_user_and_send_invite(db, manager_name, manager_email, "team_manager")
    manager_id = manager_result.get("user_id")
    if not manager_id:
        raise HTTPException(status_code=500, detail="Failed to create manager account.")
    try:
        new_team = Team(
            name=name, short_name=short_name, founded_date=parsed_founded_date,
            colors=colors, logo=logo_path, manager_id=manager_id
        )
        db.add(new_team)
        db.commit()
        db.refresh(new_team)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Team creation error: {str(e)}")
    coach_result = create_user_and_send_invite(db, coach_name, coach_email, "coach", team_id=None)
    coach_user_id = coach_result.get("user_id")
    warnings = []
    if not coach_result.get("is_new"):
        warnings.append(coach_result.get("message"))
    if not manager_result.get("is_new"):
        warnings.append(manager_result.get("message"))
    existing_coach = db.query(Coach).filter(Coach.user_id == coach_user_id).first()
    if existing_coach:
        existing_coach.team_id = new_team.id
        existing_coach.name = coach_name
        db.commit()
    else:
        new_coach = Coach(
            name=coach_name, email=coach_email, team_id=new_team.id, user_id=coach_user_id,
            photo=save_uploaded_file(coach_photo, "coaches") if coach_photo and coach_photo.filename else None
        )
        db.add(new_coach)
        db.commit()
    msg = "Team created successfully."
    if warnings:
        msg += " Notes: " + " | ".join(warnings)
    return {
        "message": msg, "team_id": new_team.id,
        "details": {
            "manager_status": "new" if manager_result.get("is_new") else "existing",
            "coach_status": "new" if coach_result.get("is_new") else "existing"
        }
    }


@router.get("/teams", response_model=List[dict])
def get_all_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for t in teams:
        logo_url = t.logo
        if logo_url and logo_url.startswith("http://127.0.0.1:8000"):
            logo_url = logo_url.replace("http://127.0.0.1:8000", "")
        result.append({"id": t.id, "name": t.name, "short_name": t.short_name,
                        "colors": t.colors, "logo": logo_url})
    return result


@router.delete("/teams/{team_id}", response_model=dict)
def delete_team(team_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
    try:
        players = db.query(Player).filter(Player.team_id == team_id).all()
        player_ids = [p.id for p in players]
        user_ids_to_delete = [p.user_id for p in players if p.user_id]
        coach = db.query(Coach).filter(Coach.team_id == team_id).first()
        coach_id = coach.id if coach else None
        if coach and coach.user_id:
            user_ids_to_delete.append(coach.user_id)
        if team.manager_id:
            user_ids_to_delete.append(team.manager_id)
        unique_user_ids = list(set([uid for uid in user_ids_to_delete if uid]))
        if player_ids:
            db.query(PlayerStat).filter(PlayerStat.player_id.in_(player_ids)).delete(synchronize_session=False)
            db.query(Player).filter(Player.id.in_(player_ids)).update({"user_id": None}, synchronize_session=False)
            db.query(Player).filter(Player.id.in_(player_ids)).delete(synchronize_session=False)
        if unique_user_ids:
            db.query(Coach).filter(Coach.user_id.in_(unique_user_ids)).update({"user_id": None}, synchronize_session=False)
        if coach_id:
            db.query(Coach).filter(Coach.id == coach_id).delete(synchronize_session=False)
        if unique_user_ids:
            db.query(Team).filter(Team.manager_id.in_(unique_user_ids)).update({"manager_id": None}, synchronize_session=False)
        db.flush()
        db.execute(tournament_teams.delete().where(tournament_teams.c.team_id == team_id))
        db.delete(team)
        db.flush()
        if unique_user_ids:
            db.query(User).filter(User.id.in_(unique_user_ids)).delete(synchronize_session=False)
        db.commit()
        return {"message": "Team deleted successfully."}
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/players", response_model=dict)
def create_player(
    name: str = Form(...), position: str = Form(...), jersey_number: int = Form(...),
    email: str = Form(None), photo: UploadFile = File(None),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    try:
        team_id = None
        if current_user.role == "team_manager":
            t = db.query(Team).filter(Team.manager_id == current_user.id).first()
            if t:
                team_id = t.id
        elif current_user.role == "coach":
            cp = db.query(Coach).filter(Coach.user_id == current_user.id).first()
            if cp:
                team_id = cp.team_id
        if not team_id:
            raise HTTPException(status_code=404, detail="No team linked to your account.")
        photo_path = None
        if photo and photo.filename:
            os.makedirs(os.path.join(UPLOAD_DIR, "players"), exist_ok=True)
            photo_path = save_uploaded_file(photo, "players")
        user_id = None
        if email and email.strip():
            user_result = create_user_and_send_invite(db, name, email, "player", player_id=None)
            user_id = user_result["user_id"]
        new_player = Player(
            name=name, position=position, jersey_number=jersey_number,
            team_id=team_id, user_id=user_id, photo=photo_path
        )
        db.add(new_player)
        db.commit()
        db.refresh(new_player)
        if email and user_id:
            new_player.user_id = user_id
            db.commit()
        return {"message": "Player added successfully.", "player_id": new_player.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/me/team", response_model=dict)
def get_my_team(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = None
    if current_user.role == "team_manager":
        team = db.query(Team).filter(Team.manager_id == current_user.id).first()
    elif current_user.role == "coach":
        cp = db.query(Coach).filter(Coach.user_id == current_user.id).first()
        if cp:
            team = db.query(Team).filter(Team.id == cp.team_id).first()
    if not team:
        raise HTTPException(404, "No team found.")
    return {
        "id": team.id, "name": team.name,
        "role_in_team": "Manager" if current_user.role == "team_manager" else "Coach",
        "player_count": db.query(Player).filter(Player.team_id == team.id).count()
    }


@router.get("/me/players", response_model=List[dict])
def get_my_players(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team_id = None
    if current_user.role == "team_manager":
        t = db.query(Team).filter(Team.manager_id == current_user.id).first()
        if t:
            team_id = t.id
    elif current_user.role == "coach":
        cp = db.query(Coach).filter(Coach.user_id == current_user.id).first()
        if cp:
            team_id = cp.team_id
    if not team_id:
        return []
    return [
        {"id": p.id, "name": p.name, "position": p.position,
         "jersey_number": p.jersey_number, "photo": p.photo}
        for p in db.query(Player).filter(Player.team_id == team_id).all()
    ]


@router.get("/me/players-with-stats", response_model=List[dict])
def get_my_players_with_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team_id = None
    if current_user.role == "team_manager":
        t = db.query(Team).filter(Team.manager_id == current_user.id).first()
        if t: team_id = t.id
    elif current_user.role == "coach":
        cp = db.query(Coach).filter(Coach.user_id == current_user.id).first()
        if cp: team_id = cp.team_id
    if not team_id:
        return []
    players = db.query(Player).filter(Player.team_id == team_id).all()
    result = []
    for player in players:
        events = db.query(MatchEvent).filter(MatchEvent.player_id == player.id).all()
        result.append({
            "id": player.id, "name": player.name, "position": player.position,
            "jersey_number": player.jersey_number, "photo": player.photo, "team_id": player.team_id,
            "stats": {
                "goals":        sum(1 for e in events if e.event_type == 'goal'),
                "assists":      sum(1 for e in events if e.event_type == 'assist'),
                "yellow_cards": sum(1 for e in events if e.event_type == 'yellow_card'),
                "red_cards":    sum(1 for e in events if e.event_type == 'red_card'),
                "matches":      len(set(e.match_id for e in events))
            }
        })
    return result


@router.get("/me/player-stats", response_model=dict)
def get_my_player_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if not player:
        raise HTTPException(status_code=404, detail="No player account linked to this user.")
    team = db.query(Team).filter(Team.id == player.team_id).first()
    events = db.query(MatchEvent).filter(MatchEvent.player_id == player.id).all()
    goals = sum(1 for e in events if e.event_type == 'goal')
    assists = sum(1 for e in events if e.event_type == 'assist')
    yellow_cards = sum(1 for e in events if e.event_type == 'yellow_card')
    red_cards = sum(1 for e in events if e.event_type == 'red_card')
    num_matches = len(set(e.match_id for e in events))
    rating = 0.0
    if num_matches > 0:
        rating = round(6.0 + (goals * 0.5) + (assists * 0.3) - (yellow_cards * 0.2) - (red_cards * 1.0), 1)
        rating = max(1.0, min(10.0, rating))
    return {
        "id": player.id, "name": player.name, "jersey_number": player.jersey_number,
        "position": player.position, "photo": player.photo,
        "team_name": team.name if team else "No team",
        "team_logo": team.logo if team else None,
        "stats": {
            "matches": num_matches, "goals": goals, "assists": assists,
            "yellow_cards": yellow_cards, "red_cards": red_cards, "rating": rating
        }
    }


@router.post("/referees", response_model=dict)
def create_referee(
    name: str = Form(...),
    email: str = Form(...),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["super_admin"])

    # Check if referee with this email already exists
    if db.query(Referee).filter(Referee.email == email).first():
        raise HTTPException(400, "A referee with this email is already registered.")

    # Handle photo upload
    photo_path = None
    if photo and photo.filename:
        try:
            photo_path = save_uploaded_file(photo, "referees")
        except Exception as e:
            raise HTTPException(500, f"Failed to upload referee photo: {str(e)}")

    # Create user account and send invite email
    try:
        user_result = create_user_and_send_invite(db, name, email, "referee", team_id=None, player_id=None)
        user_id = user_result.get("user_id")
        if not user_id:
            raise HTTPException(500, "Failed to create user account for referee.")
        is_new_user = user_result.get("is_new", False)
        message_part = "Invite email sent." if is_new_user else "Note: email already in use, no new invite sent."
    except Exception as e:
        raise HTTPException(500, f"Error creating account or sending email: {str(e)}")

    # Save referee record
    try:
        new_ref = Referee(name=name, email=email, photo=photo_path, user_id=user_id)
        db.add(new_ref)
        db.commit()
        db.refresh(new_ref)
        return {
            "message": f"✅ Referee added successfully. {message_part}",
            "referee_id": new_ref.id,
            "user_id": user_id,
            "email_sent": is_new_user
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"User account created but failed to save referee record: {str(e)}")


@router.get("/referees", response_model=List[dict])
def get_all_referees(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    refs = db.query(Referee).all()
    return [{"id": r.id, "name": r.name, "email": r.email, "user_id": r.user_id, "photo": r.photo} for r in refs]


@router.delete("/referees/{ref_id}", response_model=dict)
def delete_referee(ref_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    ref = db.query(Referee).filter(Referee.id == ref_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Referee not found.")

    user_id = ref.user_id
    db.delete(ref)
    db.flush()

    if user_id:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            db.delete(user)

    db.commit()
    return {"message": "Referee and user account deleted successfully."}


@router.get("/me/referee-matches", response_model=dict)
def get_referee_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch all matches assigned to the current referee."""
    check_role(current_user, ["referee", "super_admin"])
    ref = db.query(Referee).filter(Referee.user_id == current_user.id).first()
    if not ref:
        raise HTTPException(404, "Referee account not found.")

    matches = db.query(Match).filter(Match.referee_id == ref.id).order_by(Match.match_date.desc()).all()

    return {
        "referee": {"id": ref.id, "name": ref.name, "email": ref.email, "photo": ref.photo},
        "matches": [
            {
                "id": m.id,
                "tournament_id": m.tournament_id,
                "tournament_name": m.tournament.name if m.tournament else "—",
                "home": m.home_team.name if m.home_team else "TBD",
                "away": m.away_team.name if m.away_team else "TBD",
                "home_team_id": m.home_team_id,
                "away_team_id": m.away_team_id,
                "score_home": m.score_home,
                "score_away": m.score_away,
                "penalty_home": m.penalty_home,
                "penalty_away": m.penalty_away,
                "status": m.status,
                "match_date": str(m.match_date) if m.match_date else None,
                "round_number": m.round_number,
                "group_name": m.group_name,
                "leg_number": m.leg_number,
                "events": [
                    {
                        "id": ev.id,
                        "event_type": ev.event_type,
                        "minute": ev.minute,
                        "player_name": ev.player.name if ev.player else "—",
                        "team_name": ev.team.name if ev.team else "—",
                        "description": ev.description,
                    }
                    for ev in sorted(m.events, key=lambda e: e.minute)
                ] if m.events else [],
            }
            for m in matches
        ]
    }


@router.post("/matches/{match_id}/report", response_model=dict)
def save_match_report(
    match_id: int,
    report_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save referee notes for a match."""
    check_role(current_user, ["referee", "super_admin"])
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(404, "Match not found.")
    notes = report_data.get("notes", "")
    if hasattr(match, "referee_notes"):
        match.referee_notes = notes
        db.commit()
    return {"message": "Report saved.", "match_id": match_id, "notes": notes}


@router.post("/matches/{match_id}/upload-report", response_model=dict)
def upload_match_report(
    match_id: int,
    report: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a PDF referee report for a match."""
    check_role(current_user, ["referee", "super_admin"])
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(404, "Match not found.")

    if not report.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Only PDF files are allowed.")

    report_path = save_uploaded_file(report, "match_reports")

    if hasattr(match, "referee_report"):
        match.referee_report = report_path
        db.commit()

    return {
        "message": "Report uploaded successfully.",
        "match_id": match_id,
        "report_url": f"/{report_path}"
    }


@router.get("/tournaments/{t_id}/advanced-statistics", response_model=dict)
def get_advanced_statistics(t_id: int, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "Tournament not found.")

    # Fetch all matches (including live) so stats reflect current state
    matches = db.query(Match).filter(Match.tournament_id == t_id).all()
    match_ids = [m.id for m in matches]

    if not match_ids:
        return {
            "detailed_stats": [], "top_scorers": [],
            "top_assists": [], "most_disciplined": []
        }

    all_events = db.query(MatchEvent).filter(
        MatchEvent.match_id.in_(match_ids)
    ).all()

    # Build per-player stats
    player_stats = {}
    for ev in all_events:
        pid = ev.player_id
        if not pid:
            continue
        if pid not in player_stats:
            p = db.query(Player).filter(Player.id == pid).first()
            t = db.query(Team).filter(Team.id == ev.team_id).first()
            player_stats[pid] = {
                "player":        p.name if p else "Unknown",
                "team":          t.name if t else "Unknown",
                "photo":         p.photo if p else None,
                "number":        p.jersey_number if p else None,
                "position":      p.position if p else None,
                "goals":         0,
                "assists":       0,
                "yellow_cards":  0,
                "red_cards":     0,
                "own_goals":     0,
                "yellow":        0,
                "red":           0,
            }
        if ev.event_type == 'goal':
            player_stats[pid]["goals"] += 1
        elif ev.event_type == 'assist':
            player_stats[pid]["assists"] += 1
        elif ev.event_type == 'yellow_card':
            player_stats[pid]["yellow_cards"] += 1
            player_stats[pid]["yellow"] += 1
        elif ev.event_type == 'red_card':
            player_stats[pid]["red_cards"] += 1
            player_stats[pid]["red"] += 1
        elif ev.event_type == 'own_goal':
            player_stats[pid]["own_goals"] += 1

    player_list = list(player_stats.values())

    top_scorers      = [p for p in sorted(player_list, key=lambda x: x["goals"],   reverse=True) if p["goals"] > 0]
    top_assists      = [p for p in sorted(player_list, key=lambda x: x["assists"], reverse=True) if p["assists"] > 0]
    most_disciplined = [p for p in sorted(player_list, key=lambda x: x["yellow_cards"] + x["red_cards"] * 3, reverse=True) if p["yellow_cards"] + p["red_cards"] > 0]
    detailed_stats   = sorted(player_list, key=lambda x: x["goals"], reverse=True)

    return {
        "detailed_stats":    detailed_stats,
        "top_scorers":       top_scorers[:10],
        "top_assists":       top_assists[:10],
        "most_disciplined":  most_disciplined[:10],
    }