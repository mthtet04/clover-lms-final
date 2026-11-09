import type {Course, Submission, Enrollment } from '../types';

const API_URL = 'http://localhost:3000/api';

export const loginUser = async (email: string, password: string, role: string) => {
  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  return res.json();
};

export const fetchCourses = async (): Promise<Course[]> => {
  const res = await fetch(`${API_URL}/courses`);
  return res.json();
};

export const createCourse = async (title: string, price: number, instructorEmail: string) => {
  const res = await fetch(`${API_URL}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, price, instructor_email: instructorEmail })
  });
  return res.json();
};

export const addVideo = async (courseId: number, title: string, url: string) => {
  const res = await fetch(`${API_URL}/courses/${courseId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, url })
  });
  return res.json();
};

export const addAssignment = async (courseId: number, title: string, desc: string) => {
  const res = await fetch(`${API_URL}/courses/${courseId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, desc })
  });
  return res.json();
};

export const fetchEnrollments = async (): Promise<Enrollment[]> => {
  const res = await fetch(`${API_URL}/enrollments`);
  return res.json();
};

export const enrollInCourse = async (studentEmail: string, courseId: number) => {
  const res = await fetch(`${API_URL}/enrollments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentEmail, courseId })
  });
  return res.json();
};

export const fetchSubmissions = async (): Promise<Submission[]> => {
  const res = await fetch(`${API_URL}/submissions`);
  return res.json();
};

export const submitAssignmentApi = async (data: Partial<Submission>) => {
  const res = await fetch(`${API_URL}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const gradeSubmissionApi = async (id: number, marks: number, feedback: string) => {
  const res = await fetch(`${API_URL}/submissions/${id}/grade`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ marks, feedback })
  });
  return res.json();
};

export const registerUser = async (email: string, password: string, role: string) => {
  const res = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  return res.json();
};