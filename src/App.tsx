import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Teacher = { id: number; name: string };
type Group = { id: number; name: string; studentCount: number };
type Subject = { id: number; name: string };
type Room = { id: number; name: string; capacity: number; type: string };
type Lesson = {
  id: number;
  subjectId: number;
  teacherId: number;
  groupId: number;
  roomId: number;
  weekday: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  groupName: string;
  roomName: string;
};
type ApiError = { message?: string };

const weekdays = ["Дүйсенбі", "Сейсенбі", "Сәрсенбі", "Бейсенбі", "Жұма"];
const weekOptions = weekdays.map((name, index) => ({ name, value: index + 1 }));

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(error.message ?? `Сұрау орындалмады (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function App() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const [nextTeachers, nextGroups, nextSubjects, nextRooms, nextLessons] = await Promise.all([
      request<Teacher[]>("teachers"),
      request<Group[]>("groups"),
      request<Subject[]>("subjects"),
      request<Room[]>("rooms"),
      request<Lesson[]>("lessons"),
    ]);
    setTeachers(nextTeachers);
    setGroups(nextGroups);
    setSubjects(nextSubjects);
    setRooms(nextRooms);
    setLessons(nextLessons);
  }, []);

  useEffect(() => {
    refresh().catch((loadError: Error) => setError(`Деректер жүктелмеді: ${loadError.message}`));
  }, [refresh]);

  async function addReference(
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
    fields: string[],
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const data: Record<string, string | number> = Object.fromEntries(
      [...new FormData(form).entries()].map(([key, value]) => [key, String(value)]),
    );
    for (const field of fields) {
      if (field === "studentCount" || field === "capacity") data[field] = Number(data[field]);
    }
    setError("");
    setNotice("");
    try {
      await request(endpoint, { method: "POST", body: JSON.stringify(data) });
      form.reset();
      await refresh();
      setNotice("Анықтамалыққа сәтті қосылды");
    } catch (saveError) {
      setError((saveError as Error).message);
    }
  }

  async function addLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const data = {
      ...raw,
      subjectId: Number(raw.subjectId),
      teacherId: Number(raw.teacherId),
      groupId: Number(raw.groupId),
      roomId: Number(raw.roomId),
      weekday: Number(raw.weekday),
    };
    setError("");
    setNotice("");
    try {
      await request("lessons", { method: "POST", body: JSON.stringify(data) });
      form.reset();
      await refresh();
      setNotice("Сабақ кестеге қосылды");
    } catch (saveError) {
      setError(`Сабақ қосылмады: ${(saveError as Error).message.toLowerCase()}.`);
    }
  }

  async function deleteLesson(id: number) {
    setError("");
    setNotice("");
    try {
      await request(`lessons/${id}`, { method: "DELETE" });
      await refresh();
      setNotice("Сабақ кестеден жойылды");
    } catch (deleteError) {
      setError(`Сабақ жойылмады: ${(deleteError as Error).message}`);
    }
  }

  const referenceCards = [
    {
      title: "Мұғалімдер",
      endpoint: "teachers",
      fields: [{ name: "name", label: "Аты-жөні", placeholder: "Мысалы, Айгүл Сәрсенова" }],
      items: teachers.map((item) => item.name),
    },
    {
      title: "Топтар",
      endpoint: "groups",
      fields: [
        { name: "name", label: "Топ атауы", placeholder: "Мысалы, ИС-21" },
        { name: "studentCount", label: "Студент саны", placeholder: "25", type: "number" },
      ],
      items: groups.map((item) => `${item.name} · ${item.studentCount} студент`),
    },
    {
      title: "Пәндер",
      endpoint: "subjects",
      fields: [{ name: "name", label: "Пән атауы", placeholder: "Мысалы, Математика" }],
      items: subjects.map((item) => item.name),
    },
    {
      title: "Аудиториялар",
      endpoint: "rooms",
      fields: [
        { name: "name", label: "Аудитория атауы", placeholder: "Мысалы, 204" },
        { name: "capacity", label: "Сыйымдылығы", placeholder: "30", type: "number" },
        { name: "type", label: "Түрі", placeholder: "Дәрісхана" },
      ],
      items: rooms.map((item) => `${item.name} · ${item.capacity} орын · ${item.type}`),
    },
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Smart Timetable басты беті">
          <span className="brand-mark">S</span>
          <span>smart<span className="brand-light">timetable</span></span>
        </a>
        <span className="topbar-label"><span className="status-dot" /> Кесте басқару</span>
      </header>

      <section className="intro">
        <div className="eyebrow">ОҚУ ҮДЕРІСІ · 2026</div>
        <h1>Апталық кесте</h1>
        <p>Анықтамалықтарды толтырып, сабақ кестесін бір жерден басқарыңыз.</p>
        <div className="intro-meta">
          <span><strong>{lessons.length}</strong> сабақ</span>
          <span className="meta-divider" />
          <span><strong>{teachers.length}</strong> мұғалім</span>
          <span className="meta-divider" />
          <span><strong>{groups.length}</strong> топ</span>
        </div>
      </section>

      {(error || notice) && (
        <div className={`feedback ${error ? "feedback-error" : "feedback-success"}`} role="status">
          <span aria-hidden="true">{error ? "!" : "✓"}</span>
          {error || notice}
          <button type="button" className="feedback-close" onClick={() => { setError(""); setNotice(""); }} aria-label="Хабарламаны жабу">×</button>
        </div>
      )}

      <section className="section-block">
        <div className="section-heading">
          <div><span className="section-kicker">БАПТАУ</span><h2>Анықтамалықтар</h2></div>
          <span className="section-note">Кестеге қажетті деректер</span>
        </div>
        <div className="reference-grid">
          {referenceCards.map((card) => (
            <article className="panel reference-card" key={card.endpoint}>
              <div className="card-title-row"><h3>{card.title}</h3><span className="count-badge">{card.items.length}</span></div>
              <form className="reference-form" onSubmit={(event) => addReference(event, card.endpoint, card.fields.map((field) => field.name))}>
                {card.fields.map((field) => (
                  <label className="field" key={field.name}>
                    <span>{field.label}</span>
                    <input name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} min={field.type === "number" ? 1 : undefined} required />
                  </label>
                ))}
                <button className="button button-secondary" type="submit"><span>+</span> Қосу</button>
              </form>
              <ul className="reference-list">
                {card.items.length ? card.items.map((item, index) => <li key={`${item}-${index}`}><span className="list-indicator" />{item}</li>) : <li className="empty-item">Әзірше бос</li>}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block schedule-section">
        <div className="section-heading">
          <div><span className="section-kicker">ЖОСПАРЛАУ</span><h2>Сабақ кестесі</h2></div>
          <span className="section-note">Дүйсенбі — Жұма</span>
        </div>
        <div className="panel lesson-panel">
          <div className="panel-heading">
            <div className="panel-icon">＋</div>
            <div><h3>Сабақ қосу</h3><p>Жаңа сабақ уақытын кестеге енгізіңіз</p></div>
          </div>
          <form className="lesson-form" onSubmit={addLesson}>
            <label className="field"><span>Пән</span><select name="subjectId" defaultValue="" required><option value="" disabled>Пәнді таңдаңыз</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="field"><span>Мұғалім</span><select name="teacherId" defaultValue="" required><option value="" disabled>Мұғалімді таңдаңыз</option>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="field"><span>Топ</span><select name="groupId" defaultValue="" required><option value="" disabled>Топты таңдаңыз</option>{groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="field"><span>Аудитория</span><select name="roomId" defaultValue="" required><option value="" disabled>Аудиторияны таңдаңыз</option>{rooms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.capacity} орын</option>)}</select></label>
            <label className="field"><span>Апта күні</span><select name="weekday" defaultValue="" required><option value="" disabled>Күнді таңдаңыз</option>{weekOptions.map((day) => <option key={day.value} value={day.value}>{day.name}</option>)}</select></label>
            <label className="field"><span>Басталуы</span><input name="startTime" type="time" required /></label>
            <label className="field"><span>Аяқталуы</span><input name="endTime" type="time" required /></label>
            <button className="button button-primary lesson-submit" type="submit"><span>＋</span> Сабақ қосу</button>
          </form>
        </div>

        <div className="schedule-table-wrap panel">
          <table className="schedule-table">
            <thead><tr><th className="time-column">Уақыт</th>{weekdays.map((day) => <th key={day}>{day}</th>)}</tr></thead>
            <tbody>
              {Array.from(new Set(lessons.map((lesson) => `${lesson.startTime}–${lesson.endTime}`))).sort().map((slot) => {
                const [startTime, endTime] = slot.split("–");
                return (
                  <tr key={slot}>
                    <th className="time-cell">{startTime}<span>{endTime}</span></th>
                    {weekOptions.map((day) => (
                      <td key={day.value}>
                        {lessons.filter((lesson) => lesson.weekday === day.value && `${lesson.startTime}–${lesson.endTime}` === slot).map((lesson) => (
                          <article className="lesson-card" key={lesson.id}>
                            <div className="lesson-card-top"><span className="lesson-subject">{lesson.subjectName}</span><button type="button" className="delete-button" onClick={() => deleteLesson(lesson.id)} aria-label={`${lesson.subjectName} сабағын жою`} title="Сабақты жою">×</button></div>
                            <span className="lesson-detail"><span className="detail-icon">◉</span>{lesson.teacherName}</span>
                            <span className="lesson-detail"><span className="detail-icon">⌂</span>{lesson.groupName}</span>
                            <span className="lesson-room">{lesson.roomName}</span>
                          </article>
                        ))}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {lessons.length === 0 && <tr><td className="schedule-empty" colSpan={6}><span className="empty-calendar">▦</span><strong>Кесте әзірге бос</strong><span>Алдымен анықтамалықтарды толтырып, алғашқы сабақты қосыңыз.</span></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <footer className="footer"><span>Smart Timetable</span><span>Оқу кестесін жоспарлау оңайырақ.</span></footer>
    </main>
  );
}

export default App;
