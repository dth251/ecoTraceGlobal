import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

conn = psycopg2.connect(host='localhost', port=5432, user='postgres', password='postgres', dbname='postgres')
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

cur.execute("SELECT 1 FROM pg_user WHERE usename = 'ecotrace'")
if not cur.fetchone():
    cur.execute("CREATE USER ecotrace WITH PASSWORD 'change-me' SUPERUSER;")
    print("Created user ecotrace")
else:
    cur.execute("ALTER USER ecotrace WITH PASSWORD 'change-me';")
    print("Updated user ecotrace")

cur.execute("GRANT ALL PRIVILEGES ON DATABASE ecotrace TO ecotrace;")
cur.execute("GRANT ALL PRIVILEGES ON DATABASE ecotrace_ai TO ecotrace;")
cur.close()
conn.close()
print("PostgreSQL ecotrace user ready!")

