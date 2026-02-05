from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    import os.path
    
    try:
        sql_paths = ['init.sql', 'app/init.sql', '../init.sql']
        sql_file_path = None
        
        for path in sql_paths:
            if os.path.exists(path):
                sql_file_path = path
                break
        
        if not sql_file_path:
            print("init.sql not found - tables might not be created")
            return
        
        with open(sql_file_path, 'r') as f:
            sql_script = f.read()
        
        print("Initializing database schema...")
        
        statements = [s.strip() for s in sql_script.split(';') if s.strip()]
        
        with engine.connect() as conn:
            for statement in statements:
                if any(x in statement.upper() for x in ['CREATE DATABASE', '\\C', 'DROP DATABASE']):
                    continue
                
                if not statement.strip():
                    continue
                
                try:
                    conn.execute(text(statement))
                    conn.commit()
                    print(f"{statement.split()[0:3]}")
                except Exception as e:
                    if 'already exists' in str(e).lower():
                        print(f"Table exists (OK)")
                    else:
                        print(f"Error: {str(e)[:80]}")
        
        print("Database initialized!")
        
    except Exception as e:
        print(f"Init error: {e}")