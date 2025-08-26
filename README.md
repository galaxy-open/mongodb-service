# MongoDB Service SSPL

Open-source MongoDB hosting platform licensed under the Server Side Public License v1.

## 📜 License

This project is licensed under the **Server Side Public License v1** (SSPL-1.0).

### What this means:

✅ **You CAN:**
- Use this software for any purpose
- Study and modify the source code
- Distribute copies of the software
- Run your own MongoDB hosting service

⚠️ **You MUST:**
- Make the source code of this service publicly available
- If you offer this as a service, provide the complete source code including:
  - All software used to offer the service
  - Management software, user interfaces, APIs
  - Monitoring, analytics, and operational tooling
  - All software that users of the service interact with

📚 **Learn more:** [MongoDB SSPL FAQ](https://www.mongodb.com/licensing/server-side-public-license/faq)

## 🚀 Quick Start
### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 22+](https://nodejs.org/) (for local development)

### Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/galaxy-sspl/mongodb-service.git
   cd mongodb-service
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Update your `.env` file** with your database credentials and settings.

### Running the Project

#### 🔧 Development Mode (Recommended for development)

**Step 1: Start PostgreSQL and Redis Services**

Start only the essential infrastructure services:
```bash
# Start PostgreSQL and Redis via Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Check service health
docker-compose -f docker-compose.dev.yml ps
```

**Step 2: Install Dependencies**

```bash
# Install Node.js dependencies
npm install
```

**Step 3: Run Database Migrations**

```bash
# Run migrations to set up database schema
npm run migration:run

# Check migration status
npm run migration:status
```

**Step 4: Start Application Services Manually**

Now you can run the application components individually as needed:

```bash
# Terminal 1: Start the main application server
npm run dev

# Terminal 2: Start the queue worker (optional, for background jobs)
npm run queue:listen

# Terminal 3: Start the scheduler (optional, for cron jobs)
npm run scheduler:dev
```

**Development setup includes:**
- **PostgreSQL** (`postgres_dev`): Database on port 5432
- **Redis** (`redis_dev`): Cache and sessions on port 6379
- **Main App**: Web server with hot reloading on port 3333 (manual)
- **Queue Worker**: Background job processor (manual)
- **Scheduler**: Cron jobs with file watching (manual)


### Database Management

#### Migration Commands

```bash
# Run pending migrations
npm run migration:run

# Check migration status
npm run migration:status

# Rollback last migration batch
npm run migration:rollback

# Fresh start (drop all tables + recreate + seed)
npm run migration:fresh --seed
```

#### Database Access

```bash
# Access database shell via Docker
docker-compose -f docker-compose.dev.yml exec postgres psql -U $DB_USER -d $DB_DATABASE
```



### Service Components

| Service | Port | Purpose | How to Run |
|---------|------|---------|------------|
| **PostgreSQL** | 5432 | Primary database | `docker-compose -f docker-compose.dev.yml up -d` |
| **Redis** | 6379 | Cache & sessions | `docker-compose -f docker-compose.dev.yml up -d` |
| **App** | 3333 | Main web application | `npm run dev` |
| **Queue Worker** | - | Background jobs | `npm run queue:listen` |
| **Scheduler** | - | Cron jobs | `npm run scheduler:dev` |

### Useful Commands

#### Infrastructure Management
```bash
# Start database and cache services
docker-compose -f docker-compose.dev.yml up -d

# Stop database and cache services
docker-compose -f docker-compose.dev.yml down

# View service logs
docker-compose -f docker-compose.dev.yml logs -f postgres
docker-compose -f docker-compose.dev.yml logs -f redis

# Check service status
docker-compose -f docker-compose.dev.yml ps
```

#### Application Management
```bash
# Development server with hot reloading
npm run dev

# Background job processing
npm run queue:listen

# Scheduled tasks (development mode with file watching)
npm run scheduler:dev

# Run tests
npm test

# Code formatting and linting
npm run format
npm run lint

# Type checking
npm run typecheck
```

#### Database Operations
```bash
# Migration management
npm run migration:run
npm run migration:rollback
npm run migration:status

# Build application for production
npm run build

# Start production server
npm start
```

### Development Workflow

#### First Time Setup
```bash
# Clone and setup
git clone https://github.com/galaxy-sspl/mongodb-service.git
cd mongodb-service
cp .env.example .env

# Start infrastructure services
docker-compose -f docker-compose.dev.yml up -d

# Install dependencies
npm install

# Run initial migrations
npm run migration:run

# Start development server
npm run dev
```

#### Daily Development
```bash
# Start infrastructure (if not already running)
docker-compose -f docker-compose.dev.yml up -d

# Start your development server
npm run dev

# In separate terminals (as needed):
npm run queue:listen    # For background jobs
npm run scheduler:dev   # For scheduled tasks
```

#### Branch Switching
```bash
# When switching branches that might have new migrations
git checkout feature/new-migrations
npm run migration:run

# Install any new dependencies
npm install
```

### Troubleshooting

- **Port conflicts**: Ensure ports 3333, 5432, and 6379 are available
- **Database connection**: Check that PostgreSQL is healthy with `docker-compose -f docker-compose.dev.yml ps`
- **Permission issues**: Run `docker-compose -f docker-compose.dev.yml down -v` to reset volumes
- **Fresh database**: Stop containers with `docker-compose -f docker-compose.dev.yml down -v` then start again
- **Dependencies**: Run `npm install` if you encounter module-related errors
- **Migration issues**: Check migration status with `npm run migration:status`

### Stopping Services

```bash
# Stop the Node.js application (Ctrl+C in the terminal where it's running)

# Stop infrastructure services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (fresh start)
docker-compose -f docker-compose.dev.yml down -v
```

## 📄 License Compliance

When offering this software as a service, you must make available the Service Source Code under SSPL-1.0. This includes all software used to offer the service.

See [COMPLIANCE.md](./COMPLIANCE.md) for detailed compliance guidelines.
