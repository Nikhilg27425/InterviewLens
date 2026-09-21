"""
Create InterviewLens database if it doesn't exist
"""
import asyncio
import asyncpg
from app.core.config import settings

async def create_database():
    # Extract connection details from DATABASE_URL
    # Format: postgresql+asyncpg://user:pass@host:port/dbname
    url = settings.DATABASE_URL.replace('postgresql+asyncpg://', '')
    
    # Split to get user:pass@host:port/dbname
    auth_and_host = url.split('/')
    db_name = auth_and_host[-1]  # interviewlens
    
    # Get user:pass@host:port
    auth_host_port = auth_and_host[0]
    
    # Split to get host:port
    at_split = auth_host_port.split('@')
    user_pass = at_split[0]
    host_port = at_split[1]
    
    # Get user and password
    user = user_pass.split(':')[0]
    password = ':'.join(user_pass.split(':')[1:])  # In case password has colons
    
    # Get host and port
    host = host_port.split(':')[0]
    port = int(host_port.split(':')[1])
    
    print(f"Connecting to PostgreSQL as '{user}' on {host}:{port}...")
    print(f"Target database: '{db_name}'")
    print()
    
    try:
        # Connect to 'postgres' database (default database that always exists)
        conn = await asyncpg.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            database='postgres'
        )
        
        print("✓ Connected to PostgreSQL successfully!")
        print()
        
        # Check if database exists
        result = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            db_name
        )
        
        if result:
            print(f"✓ Database '{db_name}' already exists!")
        else:
            print(f"Creating database '{db_name}'...")
            # Can't use parameters for CREATE DATABASE
            await conn.execute(f'CREATE DATABASE {db_name}')
            print(f"✓ Database '{db_name}' created successfully!")
        
        await conn.close()
        
        print()
        print("=" * 50)
        print("✅ Database setup complete!")
        print()
        print("Now start the backend:")
        print("   python -m uvicorn app.main:app --reload")
        print()
        
    except asyncpg.exceptions.InvalidPasswordError:
        print("✗ Invalid password!")
        print()
        print("Update the password in backend\\.env file:")
        print("   DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/interviewlens")
        print()
        
    except Exception as e:
        print(f"✗ Error: {e}")
        print()
        print("Make sure:")
        print("1. PostgreSQL is running")
        print("2. Password is correct in .env file")
        print("3. You can connect with pgAdmin")
        print()

if __name__ == "__main__":
    asyncio.run(create_database())
