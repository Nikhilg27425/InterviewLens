# Database Migration Instructions

## Running the OAuth Migration

This guide explains how to update your database to support OAuth authentication.

---

## Prerequisites

- PostgreSQL database running
- Backend virtual environment activated
- Database connection configured in `.env`

---

## Step 1: Install Alembic (if not already installed)

```bash
cd backend
pip install alembic
```

---

## Step 2: Check Current Migration Status

```bash
cd backend
alembic current
```

You should see:
```
0001 (head)
```

---

## Step 3: Run the OAuth Migration

```bash
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade 0001 -> 0002, add oauth fields
```

---

## Step 4: Verify Migration Success

Connect to your database and check the users table:

### Using psql:
```bash
psql -U postgres -d interviewlens
```

```sql
\d users
```

You should see these new columns:
- `oauth_provider` (character varying(50))
- `oauth_id` (character varying(255))
- `profile_picture` (character varying(500))

And `hashed_password` should now be nullable.

### Using SQL Query:
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('oauth_provider', 'oauth_id', 'profile_picture', 'hashed_password');
```

---

## What the Migration Does

### 1. Makes `hashed_password` Nullable
- OAuth users don't need passwords
- Allows password-less accounts

### 2. Adds `oauth_provider` Column
- Stores which OAuth provider was used
- Values: `'google'`, `'github'`, or `NULL`

### 3. Adds `oauth_id` Column  
- Stores the provider's unique user ID
- Indexed for fast lookups
- Used to prevent duplicate accounts

### 4. Adds `profile_picture` Column
- Stores avatar URL from OAuth provider
- Can be displayed in UI

---

## Rollback (if needed)

If something goes wrong, rollback to the previous version:

```bash
alembic downgrade -1
```

This will:
- Remove the three new columns
- Make `hashed_password` non-nullable again
- Remove the index on `oauth_id`

---

## Troubleshooting

### Error: "Can't locate revision identified by '0001'"

**Solution:** The base migration hasn't run yet. Run all migrations:
```bash
alembic upgrade head
```

### Error: "column 'hashed_password' contains null values"

**Solution:** You have users without passwords. Either:
1. Delete test users: `DELETE FROM users WHERE hashed_password IS NULL;`
2. Or set dummy passwords before migration

### Error: "relation 'users' does not exist"

**Solution:** The users table hasn't been created. Run:
```bash
alembic upgrade head
```

### Error: "password authentication failed for user 'postgres'"

**Solution:** Check your `.env` file for correct database credentials:
```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/interviewlens
```

---

## Manual Migration (Alternative)

If Alembic doesn't work, you can run the SQL directly:

```sql
-- Make hashed_password nullable
ALTER TABLE users 
ALTER COLUMN hashed_password DROP NOT NULL;

-- Add OAuth fields
ALTER TABLE users 
ADD COLUMN oauth_provider VARCHAR(50);

ALTER TABLE users 
ADD COLUMN oauth_id VARCHAR(255);

ALTER TABLE users 
ADD COLUMN profile_picture VARCHAR(500);

-- Create index
CREATE INDEX ix_users_oauth_id ON users(oauth_id);

-- Insert version record (optional, for Alembic tracking)
INSERT INTO alembic_version (version_num) VALUES ('0002');
```

---

## Verification Queries

### Check if migration ran:
```sql
SELECT * FROM alembic_version;
```
Should show: `0002`

### View users table structure:
```sql
\d+ users
```

### Test OAuth user creation:
```sql
INSERT INTO users (id, email, full_name, role, oauth_provider, oauth_id, profile_picture)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'Test User',
  'interviewer',
  'google',
  'google-user-123',
  'https://example.com/avatar.jpg'
);
```

### Query OAuth users:
```sql
SELECT email, full_name, oauth_provider, oauth_id
FROM users
WHERE oauth_provider IS NOT NULL;
```

---

## Post-Migration Steps

1. ✅ Restart your backend server
2. ✅ Test OAuth login flows
3. ✅ Verify users are created correctly
4. ✅ Check that existing password logins still work

---

## Migration File Location

The migration file is located at:
```
backend/alembic/versions/0002_add_oauth_fields.py
```

You can edit this file if you need to customize the migration.

---

## Need Help?

- Check Alembic logs: `alembic history`
- View current revision: `alembic current`
- See pending migrations: `alembic show head`

For more help, see: https://alembic.sqlalchemy.org/en/latest/tutorial.html
