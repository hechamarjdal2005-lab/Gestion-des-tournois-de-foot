from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List, Optional
import random, os, shutil
from datetime import datetime, timedelta, date
from app.database import get_db
from app.models.user import User
from app.models.tournament import Tournament, Team, Coach, Match, Player, PlayerStat, Referee, Stadium, tournament_teams
from app.schemas.tournament import (
    TeamCreate, TournamentCreate, TournamentUpdate, 
    StandingSchema, MatchCreate, MatchUpdate, PlayerCreateWithEmail, RefereeData
)
from app.routes.auth import get_current_user
from app.utils.security import get_password_hash, create_access_token
from app.utils.email_service import send_reset_email
import asyncio

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def check_role(user: User, allowed_roles: List[str]):
    if user.role not in allowed_roles and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="ليس لديك الصلاحيات الكافية")

# ==========================================
# دالة مساعدة: إنشاء المستخدمين وإرسال الإيميل
# ==========================================
def create_user_and_send_invite(db: Session, name: str, email: str, role: str, team_id: Optional[int] = None, player_id: Optional[int] = None):
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        temp_pass = "TempPass123!"
        user = User(name=name, email=email, hashed_password=get_password_hash(temp_pass), role=role, is_active=True)
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

        reset_token = create_access_token(data={"sub": user.email, "type": "reset", "role": role}, expires_delta=timedelta(days=3))
        print(f"\n📧 [NEW USER] Sending invite to: {email}")
        try:
            asyncio.run(send_reset_email(email, reset_token))
            print(f"✅ Email sent successfully to {email}")
        except Exception as e:
            print(f"❌ Email sending failed: {e}")
        
        return {"user_id": user.id, "temp_password": temp_pass, "is_new": True, "message": "تم الإنشاء والإرسال."}
    
    else:
        print(f"\n⚠️ [EXISTING USER] Email '{email}' already exists.")
        return {"user_id": user.id, "temp_password": None, "is_new": False, "message": "الإيميل مستخدم مسبقاً."}

# ==========================================
# دالة حفظ الملفات (ترجع مسار نسبي فقط)
# ==========================================
def save_uploaded_file(file: UploadFile, folder: str) -> str:
    file_path = os.path.join(UPLOAD_DIR, folder, file.filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # نرجع المسار النسبي فقط ليبدأ بـ /
    return f"/{file_path}"

# ==========================================
# 1. إدارة البطولات
# ==========================================

@router.post("/tournaments", response_model=dict)
def create_tournament(t_data: TournamentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
def update_tournament_details(t_id: int, data: TournamentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament: raise HTTPException(404, "غير موجودة")
    if data.trophy_image is not None: tournament.trophy_image = data.trophy_image
    if data.name is not None: tournament.name = data.name
    db.commit()
    return {"message": "تم التحديث"}

@router.delete("/tournaments/{t_id}", response_model=dict)
def delete_tournament(t_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament: raise HTTPException(404, "غير موجودة")
    db.query(Match).filter(Match.tournament_id == t_id).delete(synchronize_session=False)
    tournament.teams = []
    db.delete(tournament)
    db.commit()
    return {"message": "تم حذف البطولة بنجاح."}

@router.get("/tournaments", response_model=List[dict])
def get_tournaments(db: Session = Depends(get_db)):
    tournaments = db.query(Tournament).all()
    return [{"id": t.id, "name": t.name, "type": t.type, "start_date": str(t.start_date), "end_date": str(t.end_date), "teams_count": len(t.teams)} for t in tournaments]

@router.get("/tournaments/{t_id}", response_model=dict)
def get_tournament_details(t_id: int, db: Session = Depends(get_db)):
    t = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not t: raise HTTPException(404, "غير موجودة")
    return {
        "id": t.id, "name": t.name, "type": t.type, "trophy_image": t.trophy_image,
        "teams": [{"id": team.id, "name": team.name} for team in t.teams],
        "matches": [
            {"id": m.id, "home": m.home_team.name if m.home_team else "انتظار", "away": m.away_team.name if m.away_team else "انتظار",
             "score_home": m.score_home, "score_away": m.score_away, "status": m.status, 
             "date": str(m.match_date), "round_number": m.round_number} 
            for m in t.matches
        ]
    }

@router.post("/tournaments/{t_id}/generate-matches", response_model=dict)
def generate_matches(t_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament: raise HTTPException(404, "غير موجودة")
    
    teams = tournament.teams
    if len(teams) < 2: raise HTTPException(400, "فريقان على الأقل")
    
    db.query(Match).filter(Match.tournament_id == t_id).delete(synchronize_session=False)
    
    start_date = tournament.start_date
    end_date = tournament.end_date
    total_days = max((end_date - start_date).days, 1)
    
    if tournament.type == "league":
        num_teams = len(teams)
        if num_teams % 2 != 0:
            teams.append(None)
            num_teams += 1
            
        num_rounds = num_teams - 1
        matches_per_round = num_teams // 2
        current_teams = teams[:]
        
        for round_idx in range(num_rounds):
            for i in range(matches_per_round):
                home = current_teams[i]
                away = current_teams[num_teams - 1 - i]
                
                if home and away:
                    days_per_round = total_days // num_rounds
                    offset = (round_idx * days_per_round) + random.randint(0, max(1, days_per_round - 1))
                    match_date = start_date + timedelta(days=min(offset, total_days))
                    
                    db.add(Match(
                        tournament_id=t_id,
                        home_team_id=home.id,
                        away_team_id=away.id,
                        match_date=match_date,
                        status="scheduled",
                        round_number=round_idx + 1
                    ))
            
            current_teams.insert(1, current_teams.pop())
            
        db.commit()
        return {"message": f"تم توليد جدول الدوري ({num_rounds} جولة)"}

    elif tournament.type == "knockout":
        if len(teams) & (len(teams) - 1) != 0:
             raise HTTPException(400, "في خروج المغلوب، يجب أن يكون عدد الفرق قوة لـ 2.")
        
        random.shuffle(teams)
        current_round_teams = teams[:]
        round_num = 1
        match_date = start_date
        
        while len(current_round_teams) > 1:
            next_round_placeholders = []
            for i in range(0, len(current_round_teams), 2):
                t1, t2 = current_round_teams[i], current_round_teams[i+1]
                db.add(Match(
                    tournament_id=t_id,
                    home_team_id=t1.id,
                    away_team_id=t2.id,
                    match_date=match_date,
                    status="scheduled",
                    round_number=round_num
                ))
                next_round_placeholders.append(None)
            
            match_date += timedelta(days=7)
            current_round_teams = next_round_placeholders
            round_num += 1
            
        db.commit()
        return {"message": "تم توليد هيكل خروج المغلوب."}
    
    return {"message": "تم التوليد"}

@router.post("/tournaments/{t_id}/advance-round", response_model=dict)
def advance_knockout_round(t_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament or tournament.type != "knockout":
        raise HTTPException(400, "غير متاح إلا لخروج المغلوب")
    
    all_matches = db.query(Match).filter(Match.tournament_id == t_id).order_by(Match.round_number).all()
    if not all_matches: raise HTTPException(400, "لا توجد مباريات")
    
    max_round = max(m.round_number for m in all_matches)
    found_round = None
    
    for r in range(1, max_round):
        round_matches = [m for m in all_matches if m.round_number == r]
        if round_matches and all(m.status == 'finished' for m in round_matches):
            next_round_matches = [m for m in all_matches if m.round_number == r + 1]
            if next_round_matches and any(m.home_team_id is None for m in next_round_matches):
                found_round = r
                break
    
    if not found_round:
        raise HTTPException(400, "لا يوجد دور مكتمل جاهز للانتقال.")
    
    target_round = found_round + 1
    completed_matches = sorted([m for m in all_matches if m.round_number == found_round], key=lambda x: x.id)
    target_matches = sorted([m for m in all_matches if m.round_number == target_round], key=lambda x: x.id)
    
    winner_idx = 0
    for i in range(0, len(completed_matches), 2):
        if winner_idx >= len(target_matches): break
        
        m1 = completed_matches[i]
        w1 = m1.home_team_id if m1.score_home > m1.score_away else m1.away_team_id
        if m1.score_home == m1.score_away: raise HTTPException(400, f"المباراة {m1.id} تعادل!")
        
        w2 = None
        if i+1 < len(completed_matches):
            m2 = completed_matches[i+1]
            w2 = m2.home_team_id if m2.score_home > m2.score_away else m2.away_team_id
            if m2.score_home == m2.score_away: raise HTTPException(400, f"المباراة {m2.id} تعادل!")
        
        t_match = target_matches[winner_idx]
        t_match.home_team_id = w1
        t_match.away_team_id = w2
        t_match.status = "scheduled"
        t_match.score_home = 0
        t_match.score_away = 0
        winner_idx += 1
    
    db.commit()
    return {"message": f"تم نقل الفائزين من الدور {found_round} إلى الدور {target_round}!"}

@router.get("/tournaments/{t_id}/standings", response_model=List[dict])
def get_tournament_standings(t_id: int, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament or tournament.type != "league": return []
    
    standings = {}
    for team in tournament.teams:
        standings[team.id] = {"id": team.id, "name": team.name, "logo": team.logo, "played": 0, "won": 0, "drawn": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "points": 0}
    
    matches = db.query(Match).filter(Match.tournament_id == t_id, Match.status == "finished").all()
    
    for m in matches:
        if m.home_team_id not in standings or m.away_team_id not in standings: continue
        home, away = standings[m.home_team_id], standings[m.away_team_id]
        home["played"] += 1; away["played"] += 1
        home["gf"] += m.score_home; home["ga"] += m.score_away
        away["gf"] += m.score_away; away["ga"] += m.score_home
        
        if m.score_home > m.score_away: home["won"] += 1; home["points"] += 3; away["lost"] += 1
        elif m.score_home < m.score_away: away["won"] += 1; away["points"] += 3; home["lost"] += 1
        else: home["drawn"] += 1; home["points"] += 1; away["drawn"] += 1; away["points"] += 1
            
        home["gd"] = home["gf"] - home["ga"]; away["gd"] = away["gf"] - away["ga"]
    
    return sorted(standings.values(), key=lambda x: (x["points"], x["gd"], x["gf"]), reverse=True)

@router.post("/tournaments/{t_id}/next-round", response_model=dict)
def next_round_action(t_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament: raise HTTPException(404, "غير موجودة")
    
    if tournament.type == "league":
        all_matches = db.query(Match).filter(Match.tournament_id == t_id).all()
        if not all_matches: raise HTTPException(400, "لا توجد مباريات")
        max_round = max(m.round_number for m in all_matches)
        current_round_num = None
        for r in range(1, max_round + 1):
            if any(m.status != "finished" for m in all_matches if m.round_number == r):
                current_round_num = r; break
        if current_round_num is None: return {"message": "✅ انتهت البطولة!"}
        unfinished = [m for m in all_matches if m.round_number == current_round_num and m.status != "finished"]
        if unfinished: raise HTTPException(400, f"باقي {len(unfinished)} مباريات في الجولة {current_round_num}.")
        return {"message": f"✅ الجولة {current_round_num} مكتملة."}
    elif tournament.type == "knockout":
        return advance_knockout_round(t_id, db, current_user)
    return {"message": "تم"}

@router.post("/matches/update-details", response_model=dict)
def update_match_details(match_id: int, details: MatchUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin", "referee"])
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match: raise HTTPException(404, "غير موجودة")
    if details.score_home is not None:
        match.score_home = details.score_home; match.score_away = details.score_away; match.status = details.status
    if details.stadium_name:
        stadium = db.query(Stadium).filter(Stadium.name == details.stadium_name).first()
        if not stadium: stadium = Stadium(name=details.stadium_name); db.add(stadium); db.commit(); db.refresh(stadium)
        match.stadium_id = stadium.id
    if details.match_time: match.match_time = details.match_time
    db.commit()
    return {"message": "تم التحديث"}

# ==========================================
# 2. إدارة الفرق
# ==========================================

@router.post("/teams", response_model=dict)
def create_team(
    name: str = Form(...), short_name: str = Form(None), founded_date: str = Form(None), colors: str = Form(None),
    manager_name: str = Form(...), manager_email: str = Form(...), coach_name: str = Form(...), coach_email: str = Form(...),
    logo: UploadFile = File(None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    check_role(current_user, ["super_admin"])
    logo_path = None
    if logo and logo.filename: logo_path = save_uploaded_file(logo, "teams")
    
    parsed_founded_date = None
    if founded_date and founded_date.strip():
        try: parsed_founded_date = datetime.strptime(founded_date, "%Y-%m-%d").date()
        except ValueError: parsed_founded_date = None

    manager_result = create_user_and_send_invite(db, manager_name, manager_email, "team_manager")
    manager_id = manager_result.get("user_id")
    if not manager_id: raise HTTPException(status_code=500, detail="فشل حساب المسؤول")

    try:
        new_team = Team(name=name, short_name=short_name, founded_date=parsed_founded_date, colors=colors, logo=logo_path, manager_id=manager_id)
        db.add(new_team); db.commit(); db.refresh(new_team)
    except Exception as e:
        db.rollback(); raise HTTPException(status_code=500, detail=f"خطأ في الفريق: {str(e)}")
    
    coach_result = create_user_and_send_invite(db, coach_name, coach_email, "coach", team_id=None)
    coach_user_id = coach_result.get("user_id")
    warnings = []
    if not coach_result.get("is_new"): warnings.append(coach_result.get("message"))
    if not manager_result.get("is_new"): warnings.append(manager_result.get("message"))

    existing_coach = db.query(Coach).filter(Coach.user_id == coach_user_id).first()
    if existing_coach:
        existing_coach.team_id = new_team.id; existing_coach.name = coach_name; db.commit()
    else:
        new_coach = Coach(name=coach_name, email=coach_email, team_id=new_team.id, user_id=coach_user_id)
        db.add(new_coach); db.commit()

    msg = "تم إنشاء الفريق بنجاح."
    if warnings: msg += " ملاحظات: " + " | ".join(warnings)
    return {"message": msg, "team_id": new_team.id, "details": {"manager_status": "جديد" if manager_result.get("is_new") else "قديم", "coach_status": "جديد" if coach_result.get("is_new") else "قديم"}}

@router.get("/teams", response_model=List[dict])
def get_all_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    result = []
    for t in teams:
        # نضمن أن الرابط نسبي دائماً
        logo_url = t.logo
        if logo_url and logo_url.startswith("http://127.0.0.1:8000"):
            logo_url = logo_url.replace("http://127.0.0.1:8000", "")
        
        result.append({"id": t.id, "name": t.name, "short_name": t.short_name, "colors": t.colors, "logo": logo_url})
    return result

@router.delete("/teams/{team_id}", response_model=dict)
def delete_team(team_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team: raise HTTPException(status_code=404, detail="الفريق غير موجود")
    
    try:
        players = db.query(Player).filter(Player.team_id == team_id).all()
        player_ids = [p.id for p in players]
        user_ids_to_delete = [p.user_id for p in players if p.user_id]
        
        coach = db.query(Coach).filter(Coach.team_id == team_id).first()
        coach_id = coach.id if coach else None
        if coach and coach.user_id: user_ids_to_delete.append(coach.user_id)
        if team.manager_id: user_ids_to_delete.append(team.manager_id)
        
        unique_user_ids = list(set([uid for uid in user_ids_to_delete if uid]))

        if player_ids:
            db.query(PlayerStat).filter(PlayerStat.player_id.in_(player_ids)).delete(synchronize_session=False)
            db.query(Player).filter(Player.id.in_(player_ids)).update({"user_id": None}, synchronize_session=False)
            db.query(Player).filter(Player.id.in_(player_ids)).delete(synchronize_session=False)

        if unique_user_ids:
            db.query(Coach).filter(Coach.user_id.in_(unique_user_ids)).update({"user_id": None}, synchronize_session=False)
        
        if coach_id: db.query(Coach).filter(Coach.id == coach_id).delete(synchronize_session=False)
        if unique_user_ids: db.query(Team).filter(Team.manager_id.in_(unique_user_ids)).update({"manager_id": None}, synchronize_session=False)

        db.flush()
        db.execute(tournament_teams.delete().where(tournament_teams.c.team_id == team_id))
        db.delete(team)
        db.flush()

        if unique_user_ids: db.query(User).filter(User.id.in_(unique_user_ids)).delete(synchronize_session=False)
        
        db.commit()
        return {"message": "تم الحذف بنجاح."}
    except Exception as e:
        db.rollback(); print(f"❌ Error: {str(e)}"); raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 3. بيانات المستخدم والإحصائيات
# ==========================================

@router.get("/me/team", response_model=dict)
def get_my_team(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team = None
    if current_user.role == "team_manager": team = db.query(Team).filter(Team.manager_id == current_user.id).first()
    elif current_user.role == "coach":
        cp = db.query(Coach).filter(Coach.user_id == current_user.id).first()
        if cp: team = db.query(Team).filter(Team.id == cp.team_id).first()
    if not team: raise HTTPException(404, "لا يوجد فريق")
    return {"id": team.id, "name": team.name, "role_in_team": "مدير" if current_user.role == "team_manager" else "مدرب", "player_count": db.query(Player).filter(Player.team_id == team.id).count()}

@router.get("/me/players", response_model=List[dict])
def get_my_players(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team_id = None
    if current_user.role == "team_manager":
        t = db.query(Team).filter(Team.manager_id == current_user.id).first()
        if t: team_id = t.id
    elif current_user.role == "coach":
        cp = db.query(Coach).filter(Coach.user_id == current_user.id).first()
        if cp: team_id = cp.team_id
    if not team_id: return []
    return [{"id": p.id, "name": p.name, "position": p.position, "jersey_number": p.jersey_number, "photo": p.photo} for p in db.query(Player).filter(Player.team_id == team_id).all()]

@router.post("/players", response_model=dict)
def create_player(name: str = Form(...), position: str = Form(...), jersey_number: int = Form(...), email: str = Form(None), photo: UploadFile = File(None), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    team_id = None
    if current_user.role == "team_manager":
        t = db.query(Team).filter(Team.manager_id == current_user.id).first()
        if t: team_id = t.id
    if not team_id: raise HTTPException(404, "لا يوجد فريق")
    
    photo_path = None
    if photo: photo_path = save_uploaded_file(photo, "players")
    
    user_id = None
    if email: user_id = create_user_and_send_invite(db, name, email, "player", player_id=None)["user_id"]
    
    new_player = Player(name=name, position=position, jersey_number=jersey_number, team_id=team_id, user_id=user_id, photo=photo_path)
    db.add(new_player); db.commit(); db.refresh(new_player)
    if email and user_id: new_player.user_id = user_id; db.commit()
    return {"message": "تم إضافة اللاعب", "player_id": new_player.id}

@router.post("/referees", response_model=dict)
def create_referee(ref_data: RefereeData, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_role(current_user, ["super_admin"])
    if db.query(Referee).filter(Referee.email == ref_data.email).first(): raise HTTPException(400, "مسجل مسبقاً")
    new_ref = Referee(name=ref_data.name, email=ref_data.email)
    db.add(new_ref); db.commit()
    create_user_and_send_invite(db, ref_data.name, ref_data.email, "referee")
    u = db.query(User).filter(User.email == ref_data.email).first()
    if u: new_ref.user_id = u.id; db.commit()
    return {"message": "تم إضافة الحكم", "referee_id": new_ref.id}

@router.get("/tournaments/{t_id}/advanced-statistics", response_model=dict)
def get_advanced_statistics(t_id: int, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == t_id).first()
    if not tournament: raise HTTPException(404, "غير موجودة")
    
    players_stats = db.query(Player.name, Player.jersey_number, Team.name.label("team_name"), func.sum(PlayerStat.goals).label("goals"), func.sum(PlayerStat.assists).label("assists"), func.sum(PlayerStat.yellow_cards).label("yellow_cards"), func.sum(PlayerStat.red_cards).label("red_cards")).join(Team).join(PlayerStat).join(Match).filter(Match.tournament_id == t_id).group_by(Player.id, Player.name, Player.jersey_number, Team.name).all()
    
    detailed_stats = [{"player": p.name, "number": p.jersey_number, "team": p.team_name, "goals": p.goals or 0, "assists": p.assists or 0, "yellow": p.yellow_cards or 0, "red": p.red_cards or 0, "own_goals": 0} for p in players_stats]
    
    return {"detailed_stats": detailed_stats, "top_scorers": sorted(detailed_stats, key=lambda x: x['goals'], reverse=True)[:5], "top_assists": sorted(detailed_stats, key=lambda x: x['assists'], reverse=True)[:5], "most_disciplined": sorted(detailed_stats, key=lambda x: x['yellow'] + (x['red']*3))[:5]}