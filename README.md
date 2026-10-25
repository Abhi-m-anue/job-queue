# Job Queue System

A learning project built to understand how background job processing works using Node.js, TypeScript, PostgreSQL, and Redis.

The project uses PostgreSQL as the persistent source of truth for jobs and Redis for queue coordination.

## Features

- REST API to create, retrieve, list, and delete jobs
- PostgreSQL for persistent job storage
- Redis-based job queue
- Separate API and worker processes
- Job status tracking: `pending`, `processing`, `completed`, `failed`
- Automatic retries for failed jobs, with a maximum of 3 retries
- Heartbeats to track active jobs
- Stale-job recovery when a worker crashes
- Docker Compose for running PostgreSQL and Redis locally

## Tech Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL (`pg`)
- Redis
- Docker Compose

## Project Structure

```text
job-queue/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── index.ts
│   │   ├── db.ts
│   │   ├── redis.ts
│   │   ├── worker.ts
│   │   └── workerMain.ts
│   ├── sql/
│   │   └── schema.sql
│   ├── package.json
│   └── .env
├── dashboard/
├── worker/
├── docker-compose.yml
└── README.md
```

The worker currently lives inside `api/src/`. The separate `worker/` directory is reserved for a possible future separation of the worker into its own application. The dashboard is also reserved for future development.

## Architecture

1. The API receives a job request.
2. The job is stored in PostgreSQL with a `pending` status.
3. The job ID is pushed into a Redis queue.
4. The worker retrieves the job ID and fetches the job details from PostgreSQL.
5. The worker marks the job as `processing`, executes it, and updates its status.
6. Failed jobs are retried up to 3 times before being marked as `failed`.
7. The worker periodically checks for stale jobs using Redis heartbeats and requeues eligible jobs.

## Prerequisites

- Node.js and npm
- Docker and Docker Compose
- A Git client

## Setup

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd job-queue
```

### 2. Start PostgreSQL and Redis

From the project root, run:

```bash
docker compose up -d
```

### 3. Configure environment variables

Create an `.env` file inside `api/` using the variable names expected by the application.

Configure the PostgreSQL connection details and Redis URL according to your `docker-compose.yml`.

Do not commit your `.env` file or secrets to GitHub.

### 4. Create the PostgreSQL table

The application requires a `jobs` table in PostgreSQL.

The schema is provided in `api/sql/schema.sql`. Run this script against the database configured in your environment.

For example, if your PostgreSQL container is named `postgres`, your database is named `jobqueue`, and the user is `postgres`, run this from the project root:

```bash
docker exec -i postgres psql -U postgres -d jobqueue < api/sql/schema.sql
```

Replace the container name, database name, and username with the values from your `docker-compose.yml`.

The schema file contains:

```sql
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

This creates the table if it doesn't already exist.

### 5. Install dependencies

```bash
cd api
npm install
```

### 6. Start the API and worker

Open separate terminals in the `api/` directory and run the appropriate npm scripts defined in `api/package.json`.

Start the API in one terminal and the worker in another.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/jobs` | Create a job |
| `GET` | `/jobs` | List jobs |
| `GET` | `/jobs/:id` | Retrieve a job by ID |
| `DELETE` | `/jobs/:id` | Delete a job |

### Example: Create a Job

Send a `POST` request to `/jobs` with the following JSON body:

```json
{
  "type": "send_email",
  "payload": {
    "to": "example@gmail.com",
    "subject": "Hello"
  }
}
```

The current worker simulates job execution; it does not send actual emails.

## Failure Handling and Recovery

- Jobs are tracked using PostgreSQL status records.
- Redis stores queued job IDs and tracks active jobs through heartbeat timestamps.
- If a worker crashes while processing a job, the recovery process can identify stale jobs and requeue them.
- Failed jobs are retried up to 3 times before being marked as permanently failed.

## Limitations

- Job processing is simulated.
- A job may execute more than once in certain crash scenarios.
- PostgreSQL and Redis updates are not atomic, so failures between operations can leave inconsistent state.
- The current recovery mechanism does not guarantee exactly-once execution.
- Authentication, monitoring, and production deployment are outside the scope of this learning project.

## Learning Goals

This project was built to understand:

- Background job processing and queue-based architecture
- API and worker separation
- PostgreSQL persistence and Redis queue coordination
- Retry mechanisms and job status tracking
- Heartbeats and stale-job recovery
- Failure scenarios in distributed systems
