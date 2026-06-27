/** Navigation param lists — shared across navigators and screens. */

export type HomeStackParams = {
  HomeHome: undefined;
};

export type MoreStackParams = {
  MoreHome: undefined;
  Contact: undefined;
  Diary: undefined;
  Timetable: undefined;
  Calendar: undefined;
  Tests: undefined;
  TestAttempt: { testId: number; title: string };
};

/**
 * Five bottom tabs. The last one is Profile — a menu hub holding Contact,
 * Diary, Timetable, school info and Logout. Keeping Contact one tap deeper
 * leaves the tab bar to the four daily-check destinations.
 */
export type MainTabParams = {
  Home: undefined;
  Attendance: undefined;
  Exams: undefined;
  Fees: undefined;
  Profile: undefined;
};
