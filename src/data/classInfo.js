// 우리 반 정보입니다. 학교·학년·반이 바뀌면 이 파일의 값만 고치면 돼요.
// 학생은 이 값을 입력하지 않고, 번호와 이름만 고릅니다.
export const CLASS_INFO = {
  school: "무안희망초등학교",
  grade: 5,
  classNo: 2,
};

// 우리 반 학생 수입니다. 시작 화면의 번호 칸이 1번부터 이 숫자까지 나옵니다.
export const CLASS_SIZE = 30;

export function classLabel() {
  return `${CLASS_INFO.school} ${CLASS_INFO.grade}학년 ${CLASS_INFO.classNo}반`;
}
