# Smart Timetable MVP

Шағын апталық сабақ кестесі: анықтамалықтарды жүргізу, сабақ қосу/жою және мұғалім, топ, аудитория қақтығыстарын тексеру.

## Іске қосу

Node.js 20 немесе одан кейінгі нұсқа қажет.

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend API: `http://localhost:3001` (routes are also available under `/api`)

Даму кезінде Vite `/api` сұрауларын backend-ке прокси жасайды. SQLite дерекқоры `data/timetable.db` ішінде автоматты түрде жасалады. Қажет болса, `DATABASE_PATH` ортасының айнымалысымен басқа файл көрсетуге болады.

## Vercel-ге орналастыру

Vercel жобасының Root Directory мәні репозиторийдің түбірі (`.`) болуы керек. Framework Preset ретінде Vite таңдаңыз; Build Command — `npm run build`, Output Directory — `dist`. `api/[...path].js` функциясы `/api/*` сұрауларын Express backend-ке бағыттайды. Node.js 22.x қолданылады.

Vercel-дегі файлдық жүйе уақытша болғандықтан, бұл MVP SQLite деректері тұрақты сақталатынына кепілдік бермейді: serverless функция `/tmp/smart-timetable.db` қолданады. Тұрақты өндірістік деректер үшін бөлек орналастырылған PostgreSQL дерекқорын қосу қажет.

## API

- `GET/POST /api/teachers`
- `GET/POST /api/groups`
- `GET/POST /api/subjects`
- `GET/POST /api/rooms`
- `GET/POST /api/lessons`
- `DELETE /api/lessons/:id`

Сабақтардың апта күні 1–5 аралығында беріледі. Уақыттар `HH:MM` форматында болуы керек; қабаттасатын уақыттарда мұғалім, топ және аудитория бір уақытта екі сабақта бола алмайды. Аудитория сыйымдылығы топтағы студент санынан кем болмауы тиіс.

Өндірісте backend-ті іске қосу үшін:

```bash
npm start
```
