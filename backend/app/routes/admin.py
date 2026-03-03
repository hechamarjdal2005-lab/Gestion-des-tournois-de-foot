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
import asyncio

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def check_role(user: User, allowed_roles: List[str]):
    if user.role not in allowed_roles and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحيات الكافية")


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
            asyncio.run(send_reset_email(email, reset_token))
            print(f"✅ Email sent successfully")
        except Exception as e:
            print(f"❌ Email failed: {e}")
        return {"user_id": user.id, "temp_password": temp_pass, "is_new": True, "message": "تم الإنشاء والإرسال."}
    else:
        return {"user_id": user.id, "temp_password": None, "is_new": False, "message": "الإيميل مستخدم مسبقاً."}


def save_uploaded_file(file: UploadFile, folder: str) -> str:
    file_path = os.path.join(UPLOAD_DIR, folder, file.filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return f"/{file_path}"


# ==========================================
# 1. إدارة البطولات
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
    return {"message": "تم إنشاء البطولة", "id": new_tournament.id}


@router.put("/tournaments/{t_id}")
def update_tournament_details(t_id: int, data: TournamentUpdate, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "غير موجودة")
    if data.trophy_image is not None:
        tournament.trophy_image = data.trophy_image
    if data.name is not None:
        tournament.name = data.name
    db.commit()
    return {"message": "تم التحديث"}


@router.delete("/tournaments/{t_id}", response_model=dict)
def delete_tournament(t_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "غير موجودة")
    db.query(Match).filter(Match.tournament_id == t_id).delete(synchronize_session=False)
    tournament.teams = []
    db.delete(tournament)
    db.commit()
    return {"message": "تم حذف البطولة بنجاح."}


@router.get("/tournaments", response_model=List[dict])
def get_tournaments(db: Session = Depends(get_db)):
    tournaments = db.query(Tournament).all()
    return [
        {
            "id": t.id, "name": t.name, "type": t.type,
            "start_date": str(t.start_date), "end_date": str(t.end_date),
            "teams_count": len(t.teams)
        }
        for t in tournaments
    ]


@router.get("/tournaments/{t_id}", response_model=dict)
def get_tournament_details(t_id: int, db: Session = Depends(get_db)):
    t = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not t:
        raise HTTPException(404, "غير موجودة")
    return {
        "id": t.id, "name": t.name, "type": t.type, "trophy_image": t.trophy_image,
        "teams": [
            {
                "id": team.id,
                "name": team.name,
                "logo": team.logo,
                # ✅ جلب group_name من آخر مباراة للفريق في المجموعات
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
                "home": m.home_team.name if m.home_team else "انتظار",
                "away": m.away_team.name if m.away_team else "انتظار",
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
def generate_matches(t_id: int, config: dict, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="البطولة غير موجودة")

    teams = list(tournament.teams)
    num_teams = len(teams)

    if num_teams < 2:
        raise HTTPException(status_code=400, detail="يجب اختيار فريقين على الأقل")

    db.query(Match).filter(Match.tournament_id == t_id).delete(synchronize_session=False)

    start_date = tournament.start_date
    end_date = tournament.end_date
    total_days = max((end_date - start_date).days, 1)

    group_legs = config.get('group_stage_legs', 1)
    ko_legs = config.get('knockout_stage_legs', 1)
    num_groups = config.get('num_groups', 2)
    qualify_per_group = config.get('teams_qualify_per_group', 2)

    t_type = tournament.type

    # ==========================================
    # 1. نظام الدوري
    # ==========================================
    if t_type == "league":
        if num_teams % 2 != 0:
            teams.append(None)
            num_teams += 1

        current_teams = teams[:]
        rounds = (num_teams - 1) * group_legs
        matches_per_round = num_teams // 2
        days_per_round = total_days // rounds if rounds > 0 else 7

        for leg in range(group_legs):
            for r in range(num_teams - 1):
                match_date = start_date + timedelta(
                    days=(r + (leg * (num_teams - 1))) * days_per_round
                )
                for i in range(matches_per_round):
                    home = current_teams[i]
                    away = current_teams[num_teams - 1 - i]
                    if leg == 1:
                        home, away = away, home
                    if home and away:
                        db.add(Match(
                            tournament_id=t_id,
                            home_team_id=home.id,
                            away_team_id=away.id,
                            match_date=match_date,
                            status="scheduled",
                            round_number=str(r + 1 + (leg * (num_teams - 1))),
                            leg_number=leg + 1
                        ))
                current_teams.insert(1, current_teams.pop())

        db.commit()
        return {"message": f"تم توليد جدول الدوري بنجاح ({group_legs} مباريات لكل زوج)"}

    # ==========================================
    # 2. نظام خروج المغلوب
    # ==========================================
    elif t_type == "knockout":
        if num_teams & (num_teams - 1) != 0:
            raise HTTPException(
                status_code=400,
                detail=f"في نظام خروج المغلوب، يجب أن يكون عدد الفرق قوة لـ 2. عدد الفرق الحالي: {num_teams}."
            )

        random.shuffle(teams)
        current_round_teams = teams[:]
        round_num = 1
        match_date = start_date

        while len(current_round_teams) > 1:
            next_round_teams = []
            for i in range(0, len(current_round_teams), 2):
                t1 = current_round_teams[i]
                t2 = current_round_teams[i + 1]
                if t1 and t2:
                    for leg in range(ko_legs):
                        leg_date = match_date + timedelta(days=leg * 3)
                        h_team = t2 if leg == 1 else t1
                        a_team = t1 if leg == 1 else t2
                        db.add(Match(
                            tournament_id=t_id,
                            home_team_id=h_team.id,
                            away_team_id=a_team.id,
                            match_date=leg_date,
                            status="scheduled",
                            round_number=str(round_num),
                            leg_number=leg + 1
                        ))
                    next_round_teams.append(None)

            match_date += timedelta(days=14)
            current_round_teams = next_round_teams
            round_num += 1

        db.commit()
        return {"message": f"تم توليد خروج المغلوب بنجاح ({ko_legs} مباريات لكل دور)"}

    # ==========================================
    # 3. النظام المختلط
    # ==========================================
    elif t_type == "mixed":
        if not num_groups or num_groups < 2:
            raise HTTPException(status_code=400, detail="يجب اختيار مجموعتين على الأقل")

        if num_teams % num_groups != 0:
            raise HTTPException(
                status_code=400,
                detail=f"عدد الفرق ({num_teams}) لا يقبل القسمة على عدد المجموعات ({num_groups})"
            )

        group_size = num_teams // num_groups
        random.shuffle(teams)

        groups = []
        for i in range(num_groups):
            start_idx = i * group_size
            groups.append(teams[start_idx:start_idx + group_size])

        group_match_date = start_date
        days_per_group_stage = total_days // 2

        for g_idx, group_teams in enumerate(groups):
            group_letter = chr(65 + g_idx)
            group_name = f"Group {group_letter}"
            local_teams = group_teams[:]

            if len(local_teams) % 2 != 0:
                local_teams.append(None)

            local_num = len(local_teams)
            local_rounds = (local_num - 1) * group_legs

            for leg in range(group_legs):
                current = local_teams[:]
                for r in range(local_num - 1):
                    days_offset = (r + leg * (local_num - 1)) * max(
                        days_per_group_stage // max(local_rounds, 1), 1
                    )
                    m_date = group_match_date + timedelta(days=days_offset)

                    for i in range(local_num // 2):
                        h = current[i]
                        a = current[local_num - 1 - i]
                        if leg == 1:
                            h, a = a, h

                        if h and a:
                            db.add(Match(
                                tournament_id=t_id,
                                home_team_id=h.id,
                                away_team_id=a.id,
                                match_date=m_date,
                                status="scheduled",
                                group_name=group_name,
                                round_number=str(r + 1),
                                leg_number=leg + 1
                            ))
                    current.insert(1, current.pop())

        # الأدوار الإقصائية الفارغة
        qualified_slots = num_groups * qualify_per_group
        if qualified_slots < 2:
            raise HTTPException(status_code=400, detail="يجب أن يكون عدد المتأهلين 2 على الأقل")

        ko_slots = 1
        while ko_slots < qualified_slots:
            ko_slots *= 2

        ko_start_date = group_match_date + timedelta(days=days_per_group_stage + 7)
        current_ko_count = ko_slots
        round_num = 1

        while current_ko_count > 1:
            for i in range(0, current_ko_count, 2):
                for leg in range(ko_legs):
                    db.add(Match(
                        tournament_id=t_id,
                        home_team_id=None,
                        away_team_id=None,
                        match_date=ko_start_date + timedelta(days=leg * 3),
                        status="scheduled",
                        group_name=None,
                        round_number=f"KO_R{round_num}",
                        leg_number=leg + 1
                    ))
            ko_start_date += timedelta(days=14)
            current_ko_count //= 2
            round_num += 1

        db.commit()
        return {
            "message": f"✅ تم التوليد: {num_groups} مجموعات ({group_size} فرق/مجموعة) + {round_num - 1} أدوار إقصائية لـ {ko_slots} متأهل"
        }

    else:
        raise HTTPException(status_code=400, detail="نوع بطولة غير معروف")


# ==========================================
# advance-round
# ==========================================
@router.post("/tournaments/{t_id}/advance-round", response_model=dict)
def advance_knockout_round(t_id: int, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "غير موجودة")

    if tournament.type not in ["knockout", "mixed"]:
        raise HTTPException(400, "هذه العملية متاحة فقط لبطولات خروج المغلوب أو المختلطة")

    all_matches = db.query(Match).filter(Match.tournament_id == t_id).all()
    if not all_matches:
        raise HTTPException(400, "لا توجد مباريات")

    if tournament.type == "mixed":
        ko_matches = [m for m in all_matches if not m.group_name]

        if not ko_matches:
            raise HTTPException(400, "لا توجد أدوار إقصائية. قم بتوليد المباريات أولاً.")

        ko_round_keys = sorted(
            list(set(str(m.round_number) for m in ko_matches)),
            key=lambda x: int(x.replace("KO_R", "")) if "KO_R" in str(x) else int(str(x))
        )

        found_round = None
        for r_key in ko_round_keys:
            round_matches = [m for m in ko_matches if str(m.round_number) == r_key]
            has_teams = all(m.home_team_id and m.away_team_id for m in round_matches)
            if not has_teams:
                continue

            all_finished = all(m.status == 'finished' for m in round_matches)
            if not all_finished:
                unfinished = len([m for m in round_matches if m.status != 'finished'])
                raise HTTPException(400, f"باقي {unfinished} مباريات غير منتهية في الدور {r_key}")

            current_idx = ko_round_keys.index(r_key)
            if current_idx + 1 < len(ko_round_keys):
                next_key = ko_round_keys[current_idx + 1]
                next_matches = [m for m in ko_matches if str(m.round_number) == next_key]
                if any(m.home_team_id is None for m in next_matches):
                    found_round = r_key
                    break

        if not found_round:
            last_round = ko_round_keys[-1]
            last_matches = [m for m in ko_matches if str(m.round_number) == last_round]
            if all(m.status == 'finished' for m in last_matches if m.home_team_id):
                return {"message": "🏆 انتهت البطولة! تهانينا للبطل!"}
            raise HTTPException(400, "لا يوجد دور مكتمل جاهز للانتقال، أو جميع الأدوار مكتملة.")

        current_idx = ko_round_keys.index(found_round)
        next_key = ko_round_keys[current_idx + 1]

        completed = sorted(
            [m for m in ko_matches if str(m.round_number) == found_round],
            key=lambda x: x.id
        )
        next_round_matches = sorted(
            [m for m in ko_matches if str(m.round_number) == next_key],
            key=lambda x: x.id
        )

        group_standings = _get_group_standings(tournament, db)

        if group_standings and found_round == ko_round_keys[0]:
            qualifiers = []
            for group_name, teams_standing in group_standings.items():
                for rank, team_data in enumerate(teams_standing[:qualify_per_group_from_config(next_round_matches, group_standings)], 1):
                    qualifiers.append({"team_id": team_data["id"], "rank": rank, "group": group_name})

            firsts = [q for q in qualifiers if q["rank"] == 1]
            seconds = [q for q in qualifiers if q["rank"] == 2]
            random.shuffle(seconds)

            for idx, target_match in enumerate(next_round_matches):
                if idx < len(firsts) and idx < len(seconds):
                    target_match.home_team_id = firsts[idx]["team_id"]
                    target_match.away_team_id = seconds[idx]["team_id"]
                    target_match.status = "scheduled"
                    target_match.score_home = 0
                    target_match.score_away = 0
        else:
            winners = []
            for m in completed:
                if m.score_home > m.score_away:
                    winners.append(m.home_team_id)
                elif m.score_away > m.score_home:
                    winners.append(m.away_team_id)
                else:
                    raise HTTPException(400, f"المباراة {m.id} تعادل! يجب تحديد الفائز.")

            for idx, target_match in enumerate(next_round_matches):
                if idx * 2 + 1 < len(winners):
                    target_match.home_team_id = winners[idx * 2]
                    target_match.away_team_id = winners[idx * 2 + 1]
                    target_match.status = "scheduled"
                    target_match.score_home = 0
                    target_match.score_away = 0

        db.commit()
        return {"message": f"✅ تم نقل الفائزين من {found_round} إلى {next_key}!"}

    # knockout عادي
    else:
        round_nums = sorted(list(set(
            int(m.round_number) for m in all_matches
            if m.round_number and str(m.round_number).isdigit()
        )))
        found_round = None

        for r in round_nums[:-1]:
            round_matches = [m for m in all_matches if str(m.round_number) == str(r)]
            if all(m.status == 'finished' for m in round_matches):
                next_r = round_nums[round_nums.index(r) + 1]
                next_matches = [m for m in all_matches if str(m.round_number) == str(next_r)]
                if any(m.home_team_id is None for m in next_matches):
                    found_round = r
                    break

        if not found_round:
            raise HTTPException(400, "لا يوجد دور مكتمل جاهز للانتقال.")

        next_r = round_nums[round_nums.index(found_round) + 1]
        completed = sorted(
            [m for m in all_matches if str(m.round_number) == str(found_round)],
            key=lambda x: x.id
        )
        target_matches = sorted(
            [m for m in all_matches if str(m.round_number) == str(next_r)],
            key=lambda x: x.id
        )

        winner_idx = 0
        for i in range(0, len(completed), 2):
            if winner_idx >= len(target_matches):
                break
            m1 = completed[i]
            if m1.score_home == m1.score_away:
                raise HTTPException(400, f"المباراة {m1.id} تعادل!")
            w1 = m1.home_team_id if m1.score_home > m1.score_away else m1.away_team_id
            w2 = None
            if i + 1 < len(completed):
                m2 = completed[i + 1]
                if m2.score_home == m2.score_away:
                    raise HTTPException(400, f"المباراة {m2.id} تعادل!")
                w2 = m2.home_team_id if m2.score_home > m2.score_away else m2.away_team_id

            t_match = target_matches[winner_idx]
            t_match.home_team_id = w1
            t_match.away_team_id = w2
            t_match.status = "scheduled"
            t_match.score_home = 0
            t_match.score_away = 0
            winner_idx += 1

        db.commit()
        return {"message": f"✅ تم نقل الفائزين من الدور {found_round} إلى الدور {next_r}!"}


def qualify_per_group_from_config(next_round_matches, group_standings):
    """حساب عدد المتأهلين لكل مجموعة"""
    total_qualifiers = len(next_round_matches) * 2
    num_groups = len(group_standings)
    if num_groups == 0:
        return 2
    return max(1, total_qualifiers // num_groups)


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
        raise HTTPException(404, "غير موجودة")
    if tournament.type == "league":
        all_matches = db.query(Match).filter(Match.tournament_id == t_id).all()
        if not all_matches:
            raise HTTPException(400, "لا توجد مباريات")
        round_nums = sorted(set(int(m.round_number) for m in all_matches if m.round_number and str(m.round_number).isdigit()))
        current_round_num = None
        for r in round_nums:
            if any(m.status != "finished" for m in all_matches if str(m.round_number) == str(r)):
                current_round_num = r
                break
        if current_round_num is None:
            return {"message": "✅ انتهت البطولة!"}
        unfinished = [m for m in all_matches if str(m.round_number) == str(current_round_num) and m.status != "finished"]
        if unfinished:
            raise HTTPException(400, f"باقي {len(unfinished)} مباريات في الجولة {current_round_num}.")
        return {"message": f"✅ الجولة {current_round_num} مكتملة."}
    elif tournament.type in ["knockout", "mixed"]:
        return advance_knockout_round(t_id, db, current_user)
    return {"message": "تم"}


# ==========================================
# 2. إدارة المباريات
# ==========================================

# ✅ FIX الرئيسي: update-details يقبل JSON بدل Form
class MatchUpdatePayload(BaseModel):
    referee_id: Optional[int] = None
    score_home: Optional[int] = None
    score_away: Optional[int] = None
    status: Optional[str] = None


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
        raise HTTPException(status_code=404, detail="المباراة غير موجودة")

    if not payload:
        raise HTTPException(status_code=400, detail="لا توجد بيانات")

    # تعيين الحكم دائماً إذا كان موجوداً في الـ payload
    if payload.referee_id:
        match.referee_id = payload.referee_id

    # التحقق من الحكم عند الإنهاء
    if payload.status == "finished":
        if not match.referee_id:
            raise HTTPException(
                status_code=400,
                detail="⚠️ يجب تعيين حكم للمباراة قبل إنهاؤها!"
            )

    if payload.score_home is not None:
        match.score_home = payload.score_home
    if payload.score_away is not None:
        match.score_away = payload.score_away
    if payload.status:
        match.status = payload.status

    db.commit()
    db.refresh(match)

    return {
        "message": "تم التحديث بنجاح",
        "score": f"{match.score_home} - {match.score_away}",
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
        raise HTTPException(403, "غير مصرح لك بإرسال التشكيلة")

    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(404, "المباراة غير موجودة")

    if team_id not in [match.home_team_id, match.away_team_id]:
        raise HTTPException(400, "هذا الفريق ليس طرفاً في هذه المباراة")

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

    both_submitted = (home_lineup and home_lineup.is_submitted) and (away_lineup and away_lineup.is_submitted)

    if both_submitted and match.status == "scheduled":
        match.status = "lineup_submitted"
        db.commit()

    return {"message": "تم إرسال التشكيلة بنجاح", "ready_to_play": both_submitted, "formation": formation}


@router.get("/matches/{match_id}/lineups", response_model=dict)
def get_match_lineups(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(404, "المباراة غير موجودة")

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
            return [{"id": p.id, "name": p.name, "number": p.jersey_number, "position": p.position} for p in players]
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
        raise HTTPException(404, "المباراة غير موجودة")

    try:
        new_event = MatchEvent(
            match_id=match_id, team_id=team_id, player_id=player_id,
            event_type=event_type, minute=int(minute)
        )
        db.add(new_event)

        if event_type == 'goal':
            if team_id == match.home_team_id:
                match.score_home += 1
            else:
                match.score_away += 1
            if match.status != "live":
                match.status = "live"
        elif event_type == 'own_goal':
            if team_id == match.home_team_id:
                match.score_away += 1
            else:
                match.score_home += 1
            if match.status != "live":
                match.status = "live"

        db.commit()
        return {
            "message": "تم تسجيل الحدث بنجاح",
            "current_score": f"{match.score_home} - {match.score_away}",
            "status": match.status
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"حدث خطأ داخلي: {str(e)}")


# ==========================================
# 3. إدارة الفرق واللاعبين
# ==========================================

@router.post("/teams", response_model=dict)
def create_team(
    name: str = Form(...), short_name: str = Form(None), founded_date: str = Form(None),
    colors: str = Form(None), manager_name: str = Form(...), manager_email: str = Form(...),
    coach_name: str = Form(...), coach_email: str = Form(...),
    logo: UploadFile = File(None), db: Session = Depends(get_db),
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
        raise HTTPException(status_code=500, detail="فشل حساب المسؤول")
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
        raise HTTPException(status_code=500, detail=f"خطأ في الفريق: {str(e)}")
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
        new_coach = Coach(name=coach_name, email=coach_email, team_id=new_team.id, user_id=coach_user_id)
        db.add(new_coach)
        db.commit()
    msg = "تم إنشاء الفريق بنجاح."
    if warnings:
        msg += " ملاحظات: " + " | ".join(warnings)
    return {
        "message": msg, "team_id": new_team.id,
        "details": {
            "manager_status": "جديد" if manager_result.get("is_new") else "قديم",
            "coach_status": "جديد" if coach_result.get("is_new") else "قديم"
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
        result.append({"id": t.id, "name": t.name, "short_name": t.short_name, "colors": t.colors, "logo": logo_url})
    return result


@router.delete("/teams/{team_id}", response_model=dict)
def delete_team(team_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="الفريق غير موجود")
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
        return {"message": "تم الحذف بنجاح."}
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
            raise HTTPException(status_code=404, detail="لا يوجد فريق مرتبط بحسابك")
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
        return {"message": "تم إضافة اللاعب بنجاح", "player_id": new_player.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"حدث خطأ داخلي: {str(e)}")


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
        raise HTTPException(404, "لا يوجد فريق")
    return {
        "id": team.id, "name": team.name,
        "role_in_team": "مدير" if current_user.role == "team_manager" else "مدرب",
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
        {"id": p.id, "name": p.name, "position": p.position, "jersey_number": p.jersey_number, "photo": p.photo}
        for p in db.query(Player).filter(Player.team_id == team_id).all()
    ]


@router.get("/me/players-with-stats", response_model=List[dict])
def get_my_players_with_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
    players = db.query(Player).filter(Player.team_id == team_id).all()
    result = []
    for player in players:
        events = db.query(MatchEvent).filter(MatchEvent.player_id == player.id).all()
        total_goals = sum(1 for e in events if e.event_type == 'goal')
        total_yellow = sum(1 for e in events if e.event_type == 'yellow_card')
        total_red = sum(1 for e in events if e.event_type == 'red_card')
        matches_played = len(set(e.match_id for e in events))
        result.append({
            "id": player.id, "name": player.name, "position": player.position,
            "jersey_number": player.jersey_number, "photo": player.photo, "team_id": player.team_id,
            "stats": {"goals": total_goals, "assists": 0, "yellow_cards": total_yellow,
                      "red_cards": total_red, "matches": matches_played}
        })
    return result


@router.get("/me/player-stats", response_model=dict)
def get_my_player_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if not player:
        raise HTTPException(status_code=404, detail="لا يوجد حساب لاعب مرتبط بهذا المستخدم")
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
        "team_name": team.name if team else "بدون فريق",
        "team_logo": team.logo if team else None,
        "stats": {
            "matches": num_matches, "goals": goals, "assists": assists,
            "yellow_cards": yellow_cards, "red_cards": red_cards, "rating": rating
        }
    }


@router.post("/referees", response_model=dict)
def create_referee(ref_data: RefereeData, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    if db.query(Referee).filter(Referee.email == ref_data.email).first():
        raise HTTPException(400, "مسجل مسبقاً")
    new_ref = Referee(name=ref_data.name, email=ref_data.email)
    db.add(new_ref)
    db.commit()
    create_user_and_send_invite(db, ref_data.name, ref_data.email, "referee")
    u = db.query(User).filter(User.email == ref_data.email).first()
    if u:
        new_ref.user_id = u.id
        db.commit()
    return {"message": "تم إضافة الحكم", "referee_id": new_ref.id}


@router.get("/referees", response_model=List[dict])
def get_all_referees(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    refs = db.query(Referee).all()
    return [{"id": r.id, "name": r.name, "email": r.email, "user_id": r.user_id} for r in refs]


@router.delete("/referees/{ref_id}", response_model=dict)
def delete_referee(ref_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    ref = db.query(Referee).filter(Referee.id == ref_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="الحكم غير موجود")
    db.delete(ref)
    db.commit()
    return {"message": "تم حذف الحكم بنجاح"}


@router.get("/tournaments/{t_id}/advanced-statistics", response_model=dict)
def get_advanced_statistics(t_id: int, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament:
        raise HTTPException(404, "غير موجودة")
    players_stats = db.query(
        Player.name, Player.jersey_number, Team.name.label("team_name"),
        func.sum(PlayerStat.goals).label("goals"),
        func.sum(PlayerStat.assists).label("assists"),
        func.sum(PlayerStat.yellow_cards).label("yellow_cards"),
        func.sum(PlayerStat.red_cards).label("red_cards")
    ).join(Team).join(PlayerStat).join(Match).filter(
        Match.tournament_id == t_id
    ).group_by(Player.id, Player.name, Player.jersey_number, Team.name).all()

    detailed_stats = [
        {
            "player": p.name, "number": p.jersey_number, "team": p.team_name,
            "goals": p.goals or 0, "assists": p.assists or 0,
            "yellow": p.yellow_cards or 0, "red": p.red_cards or 0, "own_goals": 0
        }
        for p in players_stats
    ]
    return {
        "detailed_stats": detailed_stats,
        "top_scorers": sorted(detailed_stats, key=lambda x: x['goals'], reverse=True)[:5],
        "top_assists": sorted(detailed_stats, key=lambda x: x['assists'], reverse=True)[:5],
        "most_disciplined": sorted(detailed_stats, key=lambda x: x['yellow'] + (x['red'] * 3))[:5]
    }