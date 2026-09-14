import StudentFlow from "./components/StudentFlow.jsx";
import TeacherDashboard from "./components/TeacherDashboard.jsx";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isTeacher = params.get("teacher") === "1";
  return isTeacher ? <TeacherDashboard /> : <StudentFlow />;
}
