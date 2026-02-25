from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean, Table
from sqlalchemy.orm import relationship
from app.database import Base

# جدول وسيط لربط الفرق بالبطولات
tournament_teams = Table(
    'tournament_teams', Base.metadata,
    Column('tournament_id', Integer, ForeignKey('tournaments.id'), primary_key=True),
    Column('team_id', Integer, ForeignKey('teams.id'), primary_key=True)
)

class Tournament(Base):
    __tablename__ = "tournaments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50)) # 'league', 'knockout', 'mixed'
    start_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(Boolean, default=True)
    
    # حقل جديد لصورة الكأس
    trophy_image = Column(String(500), nullable=True) 
    
    teams = relationship("Team", secondary=tournament_teams, back_populates="tournaments")
    matches = relationship("Match", back_populates="tournament", cascade="all, delete-orphan")

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    short_name = Column(String(50), nullable=True)
    founded_date = Column(Date, nullable=True)
    colors = Column(String(100), nullable=True)
    logo = Column(String(500), nullable=True)
    
    manager_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)

    tournaments = relationship("Tournament", secondary=tournament_teams, back_populates="teams")
    
    # استخدام backref لإنشاء العلاقة العكسية في User تلقائياً
    manager = relationship("User", foreign_keys=[manager_id], backref="managed_team", uselist=False)
    
    coach = relationship("Coach", back_populates="team", uselist=False, cascade="all, delete-orphan")
    players = relationship("Player", back_populates="team", cascade="all, delete-orphan")
    
    home_matches = relationship("Match", foreign_keys="Match.home_team_id", back_populates="home_team")
    away_matches = relationship("Match", foreign_keys="Match.away_team_id", back_populates="away_team")

class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    position = Column(String(100))
    team_id = Column(Integer, ForeignKey("teams.id"))
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    
    team = relationship("Team", back_populates="players")
    user = relationship("User", backref="player_profile", uselist=False)
    
    stats = relationship("PlayerStat", back_populates="player")

class Coach(Base):
    __tablename__ = "coaches"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"))
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    
    team = relationship("Team", back_populates="coach")
    user = relationship("User", backref="coach_profile", uselist=False)

class Referee(Base):
    __tablename__ = "referees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    
    user = relationship("User", backref="referee_profile", uselist=False)
    matches = relationship("Match", back_populates="referee")

class Stadium(Base):
    __tablename__ = "stadiums"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255))
    capacity = Column(Integer)
    matches = relationship("Match", back_populates="stadium")

class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"))
    home_team_id = Column(Integer, ForeignKey("teams.id"))
    away_team_id = Column(Integer, ForeignKey("teams.id"))
    stadium_id = Column(Integer, ForeignKey("stadiums.id"), nullable=True)
    referee_id = Column(Integer, ForeignKey("referees.id"), nullable=True)
    match_date = Column(Date)
    match_time = Column(String(50), nullable=True)
    score_home = Column(Integer, default=0)
    score_away = Column(Integer, default=0)
    status = Column(String(50), default="scheduled")
    round_number = Column(Integer, nullable=True)

    tournament = relationship("Tournament", back_populates="matches")
    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    stadium = relationship("Stadium", back_populates="matches")
    referee = relationship("Referee", back_populates="matches")
    player_stats = relationship("PlayerStat", back_populates="match")

class PlayerStat(Base):
    __tablename__ = "player_statistics"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"))
    match_id = Column(Integer, ForeignKey("matches.id"))
    goals = Column(Integer, default=0)
    assists = Column(Integer, default=0)
    yellow_cards = Column(Integer, default=0)
    red_cards = Column(Integer, default=0)
    
    player = relationship("Player", back_populates="stats")
    match = relationship("Match", back_populates="player_stats")