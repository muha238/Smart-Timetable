import cors from "cors";
import express from "express";
import { db } from "./database.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

const referenceRoutes = [
  {
    path: "teachers",
    table: "teachers",
    fields: ["name"],
    validate: (body) => requireText(body.name, "Мұғалімнің аты"),
  },
  {
    path: "groups",
    table: "groups",
    fields: ["name", "studentCount"],
    validate: (body) =>
      requireText(body.name, "Топ атауы") && requirePositiveInteger(body.studentCount, "Студент саны"),
  },
  {
    path: "subjects",
    table: "subjects",
    fields: ["name"],
    validate: (body) => requireText(body.name, "Пән атауы"),
  },
  {
    path: "rooms",
    table: "rooms",
    fields: ["name", "capacity", "type"],
    validate: (body) =>
      requireText(body.name, "Аудитория атауы") &&
      requirePositiveInteger(body.capacity, "Сыйымдылық") &&
      requireText(body.type, "Аудитория түрі"),
  },
];

function requireText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} толтырылуы керек`);
  }
  return true;
}

function requirePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} оң бүтін сан болуы керек`);
  }
  return true;
}

function validateTime(value, label) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error(`${label} дұрыс форматта болуы керек (HH:MM)`);
  }
}

function sendError(res, error, status = 400) {
  res.status(status).json({ success: false, message: error.message });
}

for (const resource of referenceRoutes) {
  app.get([`/${resource.path}`, `/api/${resource.path}`], (_req, res) => {
    res.json(db.prepare(`SELECT * FROM ${resource.table} ORDER BY name`).all());
  });

  app.post([`/${resource.path}`, `/api/${resource.path}`], (req, res) => {
    try {
      resource.validate(req.body);
      const values = resource.fields.map((field) =>
        field === "name" || field === "type" ? req.body[field].trim() : req.body[field],
      );
      const columns = resource.fields.join(", ");
      const placeholders = resource.fields.map(() => "?").join(", ");
      const result = db
        .prepare(`INSERT INTO ${resource.table} (${columns}) VALUES (${placeholders})`)
        .run(...values);
      const created = db.prepare(`SELECT * FROM ${resource.table} WHERE id = ?`).get(result.lastInsertRowid);
      res.status(201).json(created);
    } catch (error) {
      sendError(res, error);
    }
  });
}

app.get(["/lessons", "/api/lessons"], (_req, res) => {
  const lessons = db
    .prepare(`
      SELECT lessons.*, subjects.name AS subjectName, teachers.name AS teacherName,
             groups.name AS groupName, groups.studentCount, rooms.name AS roomName,
             rooms.capacity AS roomCapacity, rooms.type AS roomType
      FROM lessons
      JOIN subjects ON subjects.id = lessons.subjectId
      JOIN teachers ON teachers.id = lessons.teacherId
      JOIN groups ON groups.id = lessons.groupId
      JOIN rooms ON rooms.id = lessons.roomId
      ORDER BY weekday, startTime
    `)
    .all();
  res.json(lessons);
});

app.post(["/lessons", "/api/lessons"], (req, res) => {
  try {
    const { subjectId, teacherId, groupId, roomId, weekday, startTime, endTime } = req.body;
    for (const [value, label] of [
      [subjectId, "Пән"],
      [teacherId, "Мұғалім"],
      [groupId, "Топ"],
      [roomId, "Аудитория"],
    ]) {
      requirePositiveInteger(value, `${label} ID`);
    }
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 5) {
      throw new Error("Апта күні 1 мен 5 аралығында болуы керек");
    }
    validateTime(startTime, "Басталу уақыты");
    validateTime(endTime, "Аяқталу уақыты");
    if (startTime >= endTime) {
      throw new Error("Аяқталу уақыты басталу уақытынан кейін болуы керек");
    }

    const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId);
    const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId);
    const subjectExists = db.prepare("SELECT 1 FROM subjects WHERE id = ?").get(subjectId);
    const teacherExists = db.prepare("SELECT 1 FROM teachers WHERE id = ?").get(teacherId);
    if (!group || !room || !subjectExists || !teacherExists) {
      throw new Error("Таңдалған анықтамалық жазбалардың бірі табылмады");
    }
    if (room.capacity < group.studentCount) {
      throw new Error("Аудитория сыйымдылығы топтағы студент санынан аз");
    }

    const conflict = db
      .prepare(`
        SELECT teacherId, groupId, roomId
        FROM lessons
        WHERE weekday = ?
          AND startTime < ?
          AND endTime > ?
      `)
      .all(weekday, endTime, startTime)
      .find(
        (lesson) =>
          lesson.teacherId === teacherId || lesson.groupId === groupId || lesson.roomId === roomId,
      );

    if (conflict) {
      const message =
        conflict.teacherId === teacherId
          ? "Мұғалім бұл уақытта бос емес"
          : conflict.groupId === groupId
            ? "Топ бұл уақытта бос емес"
            : "Аудитория бұл уақытта бос емес";
      throw new Error(message);
    }

    const result = db
      .prepare(`
        INSERT INTO lessons (subjectId, teacherId, groupId, roomId, weekday, startTime, endTime)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(subjectId, teacherId, groupId, roomId, weekday, startTime, endTime);
    const created = db
      .prepare(`
        SELECT lessons.*, subjects.name AS subjectName, teachers.name AS teacherName,
               groups.name AS groupName, groups.studentCount, rooms.name AS roomName,
               rooms.capacity AS roomCapacity, rooms.type AS roomType
        FROM lessons
        JOIN subjects ON subjects.id = lessons.subjectId
        JOIN teachers ON teachers.id = lessons.teacherId
        JOIN groups ON groups.id = lessons.groupId
        JOIN rooms ON rooms.id = lessons.roomId
        WHERE lessons.id = ?
      `)
      .get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (error) {
    sendError(res, error);
  }
});

app.delete(["/lessons/:id", "/api/lessons/:id"], (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, new Error("Сабақ ID дұрыс емес"));
  }
  const result = db.prepare("DELETE FROM lessons WHERE id = ?").run(id);
  if (result.changes === 0) {
    return sendError(res, new Error("Сабақ табылмады"), 404);
  }
  res.status(204).end();
});

app.listen(port, () => {
  console.log(`Smart Timetable API listening on http://localhost:${port}`);
});
