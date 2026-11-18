import StudentFlow from "./components/StudentFlow.jsx";
import TeacherDashboard from "./components/TeacherDashboard.jsx";
import BookReader from "./components/BookReader.jsx";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isTeacher = params.get("teacher") === "1";
  if (isTeacher) return <TeacherDashboard />;
  if (params.has("book")) return <BookReader />;
  return <StudentFlow />;
}
