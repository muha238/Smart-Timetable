import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const databasePath = resolve(
  process.env.DATABASE_PATH ?? fileURLToPath(new URL("../data/timetable.db", import.meta.url)),
);
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0)
  );
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    studentCount INTEGER NOT NULL CHECK (studentCount > 0)
  );
  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0)
  );
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    type TEXT NOT NULL CHECK (length(trim(type)) > 0)
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subjectId INTEGER NOT NULL REFERENCES subjects(id),
    teacherId INTEGER NOT NULL REFERENCES teachers(id),
    groupId INTEGER NOT NULL REFERENCES groups(id),
    roomId INTEGER NOT NULL REFERENCES rooms(id),
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 5),
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    CHECK (startTime < endTime)
  );
`);
