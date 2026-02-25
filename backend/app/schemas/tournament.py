from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date

class TournamentBase(BaseModel):
    name: str
    type: str
    start_date: date
    end_date: date
    trophy_image: Optional[str] = None

class TournamentCreate(TournamentBase):
    team_ids: List[int] = []

class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    trophy_image: Optional[str] = None

class TeamManagerData(BaseModel):
    name: str
    email: EmailStr

class CoachData(BaseModel):
    name: str
    email: EmailStr

class RefereeData(BaseModel):
    name: str
    email: EmailStr

class TeamBase(BaseModel):
    name: str
    short_name: Optional[str] = None
    founded_date: Optional[date] = None
    colors: Optional[str] = None
    logo: Optional[str] = None

class TeamCreate(TeamBase):
    manager: TeamManagerData
    coach: CoachData

class PlayerCreateWithEmail(BaseModel):
    name: str
    position: str
    email: EmailStr

class MatchCreate(BaseModel):
    tournament_id: int
    home_team_id: int
    away_team_id: int
    match_date: date
    match_time: Optional[str] = None
    stadium_name: Optional[str] = None
    round_number: Optional[int] = 1

class MatchUpdate(BaseModel):
    score_home: int
    score_away: int
    status: str = "finished"
    stadium_name: Optional[str] = None
    match_time: Optional[str] = None

class StandingSchema(BaseModel):
    team_name: str
    played: int
    won: int
    drawn: int
    lost: int
    gf: int
    ga: int
    gd: int
    points: int