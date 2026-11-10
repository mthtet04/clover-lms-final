import { useState, type FormEvent } from 'react';
import * as api from './services/api';
import type { User, Course, Submission, Enrollment } from './types';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // State to hold text submissions per assignment ID
  const [subContents, setSubContents] = useState<{ [key: number]: string }>({});
  
  // State to hold file attachments per assignment ID (Base64 data / File object)
  const [subFiles, setSubFiles] = useState<{ [key: number]: { name: string; data: string } | null }>({});
  
  // Submission mode per assignment ID: 'text' or 'file'
  const [subModes, setSubModes] = useState<{ [key: number]: 'text' | 'file' }>({});

  // Auth Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'instructor' | 'unistudent' | 'outsider'>('unistudent');

  // Modal State
  const [modalType, setModalType] = useState<string | null>(null);
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
  
  // State for Course View Tabs
  const [courseTab, setCourseTab] = useState<'lessons' | 'assignments'>('lessons');

  // Form Field States inside Modals
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState(0);
  const [vidTitle, setVidTitle] = useState('');
  const [vidUrl, setVidUrl] = useState('');
  const [assTitle, setAssTitle] = useState('');
  const [assDesc, setAssDesc] = useState('');
  const [gradeMarks, setGradeMarks] = useState<number | ''>('');
  const [gradeFeedback, setGradeFeedback] = useState('');

  const loadAllData = async () => {
    try {
      const [cData, eData, sData] = await Promise.all([
        api.fetchCourses(),
        api.fetchEnrollments(),
        api.fetchSubmissions()
      ]);
      setCourses(cData);
      setEnrollments(eData);
      setSubmissions(sData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    
    if (isRegistering) {
      if (role !== 'outsider') {
        alert("Only Outside Students can create a new account. Instructor and University Student accounts are pre-registered by the university.");
        return;
      }
      const data = await api.registerUser(email, password, role);
      if (data.success) {
        setCurrentUser(data.user);
        loadAllData();
      } else {
        alert(data.message);
      }
    } else {
      const data = await api.loginUser(email, password, role);
      if (data.success) {
        setCurrentUser(data.user);
        loadAllData();
      } else {
        alert(data.message);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setModalType(null);
    setEmail('');
    setPassword('');
    setRole('unistudent');
    setIsRegistering(false);
    setSubContents({});
    setSubFiles({});
    setSubModes({});
  };

  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    await api.createCourse(newTitle, newPrice, currentUser.email);
    setModalType(null);
    setNewTitle('');
    setNewPrice(0);
    loadAllData();
  };

  const handleAddVideo = async (e: FormEvent, courseId: number) => {
    e.preventDefault();
    await api.addVideo(courseId, vidTitle, vidUrl);
    setVidTitle('');
    setVidUrl('');
    loadAllData();
  };

  const handleAddAssignment = async (e: FormEvent, courseId: number) => {
    e.preventDefault();
    await api.addAssignment(courseId, assTitle, assDesc);
    setAssTitle('');
    setAssDesc('');
    loadAllData();
  };

  const handleEnroll = async (courseId: number, price: number) => {
    if (!currentUser) return;
    
    if (price > 0 && currentUser.role === 'outsider') {
      setActiveCourseId(courseId);
      setModalType('checkout');
    } else {
      try {
        const response = await api.enrollInCourse(currentUser.email, courseId);
        if (response && response.success === false) {
          alert("Failed to enroll: " + response.message);
        } else {
          await loadAllData();
        }
      } catch (error) {
        console.error("Enrollment error:", error);
        alert("An error occurred while enrolling. Check the browser console.");
      }
    }
  };

  const handleConfirmPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeCourseId) return;
    
    try {
      const response = await api.enrollInCourse(currentUser.email, activeCourseId);
      
      if (response && response.success === false) {
        alert("Database Error: " + response.message);
      } else {
        setModalType(null);
        await loadAllData();
      }
    } catch (error) {
      console.error("Payment enrollment error:", error);
      alert("An error occurred while enrolling. Check the browser console.");
    }
  };

  // Convert uploaded file to Base64 data string
  // Convert uploaded file to Base64 safely
  const handleFileChange = (assignmentId: number, file: File | null) => {
    if (!file) {
      setSubFiles(prev => ({ ...prev, [assignmentId]: null }));
      return;
    }

    // Optional size check: prevent uploading files larger than 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large! Please select a file under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSubFiles(prev => ({
        ...prev,
        [assignmentId]: {
          name: file.name,
          data: reader.result as string
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitAssignment = async (e: FormEvent, courseId: number, assignmentId: number) => {
    e.preventDefault();
    if (!currentUser) return;
    
    const mode = subModes[assignmentId] || 'text';
    let contentToSave = '';

    if (mode === 'file') {
      const fileInfo = subFiles[assignmentId];
      if (!fileInfo || !fileInfo.data) {
        alert("Please choose a file first.");
        return;
      }
      // Format file with name and base64 string
      contentToSave = `[FILE]:${fileInfo.name}|${fileInfo.data}`;
    } else {
      contentToSave = subContents[assignmentId] || '';
      if (!contentToSave.trim()) {
        alert("Please enter a response or link before submitting.");
        return;
      }
    }

    try {
      const response = await api.submitAssignmentApi({
        assignmentId,
        courseId,
        studentEmail: currentUser.email,
        studentName: currentUser.name,
        content: contentToSave
      });

      if (response && response.success === false) {
        alert("Submission Error: " + response.message);
        return;
      }

      // Clear state for this assignment upon success
      setSubContents(prev => ({ ...prev, [assignmentId]: '' }));
      setSubFiles(prev => ({ ...prev, [assignmentId]: null }));
      await loadAllData();
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit assignment. Check if your backend server (Express) body limit is set to 50mb.");
    }
  };

  const handleSaveGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeSubmissionId || gradeMarks === '') return;
    await api.gradeSubmissionApi(activeSubmissionId, Number(gradeMarks), gradeFeedback);
    setModalType(null);
    setGradeMarks('');
    setGradeFeedback('');
    loadAllData();
  };

  // Helper to render submission text, links, or downloadable file attachments
  const renderSubmissionContent = (rawContent: string) => {
    if (!rawContent) return <i>No content provided.</i>;

    // Check if submission is a File
    if (rawContent.startsWith('[FILE]:')) {
      const payload = rawContent.replace('[FILE]:', '');
      const [fileName, fileData] = payload.split('|');
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📎 <strong>File:</strong> {fileName || 'Attachment'}</span>
          {fileData && (
            <a 
              href={fileData} 
              download={fileName || 'submission_file'} 
              style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 600, fontSize: '13px' }}
            >
              Download
            </a>
          )}
        </div>
      );
    }

    // Check if submission is a Web Link
    const isUrl = /^https?:\/\/[^\s]+$/i.test(rawContent.trim());
    if (isUrl) {
      return (
        <a 
          href={rawContent.trim()} 
          target="_blank" 
          rel="noreferrer" 
          style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}
        >
          🔗 {rawContent.trim()}
        </a>
      );
    }

    // Plain text submission
    return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>"{rawContent}"</span>;
  };

  const activeCourse = courses.find(c => c.id === activeCourseId);
  const activeSubmission = submissions.find(s => s.id === activeSubmissionId);

  return (
    <>
      <header>
        <h1>🍀 CloverLMS</h1>
        {currentUser && (
          <div className="user-pill">
            <span>{currentUser.name} ({currentUser.role})</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </header>

      <div className="container">
        {!currentUser ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(80vh - 100px)' }}>
            <div style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              padding: '36px 32px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
                  {isRegistering ? 'Create your Account' : 'Welcome to CloverLMS'}
                </h2>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                  {isRegistering ? 'Sign up as an outside student to get started' : 'Please enter your details to sign in'}
                </p>
              </div>

              <div style={{
                display: 'flex',
                backgroundColor: '#f1f5f9',
                borderRadius: '10px',
                padding: '4px',
                marginBottom: '24px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setEmail('');
                    setPassword('');
                    setRole('unistudent'); 
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: !isRegistering ? '#ffffff' : 'transparent',
                    color: !isRegistering ? 'var(--primary)' : '#64748b',
                    boxShadow: !isRegistering ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setEmail('');
                    setPassword('');
                    setRole('outsider'); 
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: isRegistering ? '#ffffff' : 'transparent',
                    color: isRegistering ? 'var(--primary)' : '#64748b',
                    boxShadow: isRegistering ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@uni.com"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="instructor">Instructor (Ajarn)</option>
                    <option value="unistudent">University Student</option>
                    <option value="outsider">Outside Student</option>
                  </select>
                </div>

                {isRegistering && (
                  <div style={{
                    padding: '10px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    color: '#64748b',
                    lineHeight: '1.4'
                  }}>
                    💡 <strong>Note:</strong> Self-registration is available for outside students only. University accounts are managed by administration.
                  </div>
                )}

                <button
                  type="submit"
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    marginTop: '6px'
                  }}
                >
                  {isRegistering ? 'Register & Sign In' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div>
            <div className="dashboard-header">
              <h2>{currentUser.name ? `${currentUser.name.toUpperCase()} DASHBOARD` : `${currentUser.role.replace('uni', 'University ').toUpperCase()} DASHBOARD`}</h2>
              {currentUser.role === 'instructor' && (
                <button className="btn" onClick={() => setModalType('createCourse')}>+ Create New Course</button>
              )}
            </div>

            {currentUser.role === 'instructor' ? (
              <>
                <h3>My Taught Courses</h3>
                <div className="grid">
                  {courses
                    .filter(c => {
                      const course = c as any;
                      return course.instructor === currentUser?.email || 
                            course.instructor_email === currentUser?.email || 
                            course.instructorEmail === currentUser?.email;
                    })
                    .map(c => (
                      <div key={c.id} className="card" style={{ borderTop: '4px solid var(--primary)' }}>
                        <h4 style={{ fontSize: '18px', marginBottom: '8px' }}>{c.title}</h4>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                          Videos: {c.videos?.length || 0} | Assignments: {c.assignments?.length || 0}
                        </p>
                        <button className="btn" style={{ width: '100%' }} onClick={() => { setActiveCourseId(c.id); setModalType('manageCourse'); }}>
                          Manage Course
                        </button>
                      </div>
                    ))}
                </div>

                <h3 style={{ marginTop: '40px' }}>Student Enrollment & Project Marks Report</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Assignment</th>
                      <th>Submission Content</th>
                      <th>Status</th>
                      <th>Marks</th>
                      <th>Feedback</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(s => {
                      const currentCourseId = s.courseId || (s as any).course_id;
                      const currentAssignmentId = s.assignmentId || (s as any).assignment_id;
                      const studentName = s.studentName || (s as any).student_name || 'Unknown Student';
                      const studentEmail = s.studentEmail || (s as any).student_email || 'No email';
                      const submissionText = s.content || (s as any).submission_text || (s as any).sub_content || '';
                      
                      const course = courses.find(c => c.id === currentCourseId);
                      const assignmentName = course?.assignments?.find(a => a.id === currentAssignmentId)?.title || 'Task';
                      
                      return (
                        <tr key={s.id}>
                          <td>{studentName}<br/><small style={{ color: '#666' }}>{studentEmail}</small></td>
                          <td>{course?.title || 'Unknown Course'}</td>
                          <td>{assignmentName}</td>
                          <td style={{ maxWidth: '300px', padding: '12px 8px' }}>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#334155',
                              backgroundColor: '#f8fafc',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0'
                            }}>
                              {renderSubmissionContent(submissionText)}
                            </div>
                          </td>
                          <td><span className={`badge ${s.status === 'Graded' ? 'badge-success' : 'badge-pending'}`}>{s.status}</span></td>
                          <td>{s.marks !== null ? `${s.marks}/100` : 'N/A'}</td>
                          <td>{s.feedback || '-'}</td>
                          <td>
                            <button className="btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setActiveSubmissionId(s.id); setGradeMarks(s.marks || ''); setGradeFeedback(s.feedback || ''); setModalType('grade'); }}>
                              {s.status === 'Pending' ? 'Grade' : 'Edit Grade'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <>
                <h3>My Enrolled Courses</h3>
                <div className="grid">
                  {courses.filter(c => enrollments.some(e => e.courseId === c.id && e.studentEmail === currentUser.email)).map(c => {
                    const courseAssignments = c.assignments || [];
                    
                    const studentSubmissions = courseAssignments.map(a => 
                      submissions.find(s => 
                        (s.assignmentId === a.id || (s as any).assignment_id === a.id) && 
                        (s.studentEmail === currentUser?.email || (s as any).student_email === currentUser?.email)
                      )
                    ).filter(sub => sub !== undefined);
                    
                    const isFinished = courseAssignments.length > 0 && studentSubmissions.length === courseAssignments.length;
                    
                    let totalMarks = 0;
                    let gradedCount = 0;
                    studentSubmissions.forEach(sub => {
                      const currentSub = sub as any;
                      if (currentSub.status === 'Graded' && currentSub.marks !== null) {
                        totalMarks += Number(currentSub.marks);
                        gradedCount++;
                      }
                    });
                    
                    const average = gradedCount > 0 ? totalMarks / gradedCount : 0;
                    let letterGrade = 'F';
                    if (average > 80) letterGrade = 'A';
                    else if (average > 60) letterGrade = 'B';
                    else if (average > 40) letterGrade = 'C';
                    
                    const status = isFinished ? 'Finished' : 'Active';

                    return (
                      <div key={c.id} className="card" style={{ borderLeft: '4px solid var(--primary)', position: 'relative' }}>
                        <span className={`badge ${status === 'Finished' ? 'badge-success' : 'badge-pending'}`} style={{ position: 'absolute', top: '15px', right: '15px' }}>
                          {status}
                        </span>
                        
                        <h4 style={{ fontSize: '18px', marginBottom: '8px', paddingRight: '60px' }}>{c.title}</h4>
                        
                        {isFinished && gradedCount === courseAssignments.length && (
                          <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#eef8f1', borderRadius: '4px', border: '1px solid #c3e6cb', color: '#155724' }}>
                            <strong>Final Grade: {letterGrade}</strong> <small>(Avg: {average.toFixed(1)}%)</small>
                          </div>
                        )}
                        
                        <button className="btn" style={{ marginTop: '15px', width: '100%' }} onClick={() => { 
                          setActiveCourseId(c.id); 
                          setCourseTab('lessons');
                          setModalType('viewCourse'); 
                        }}>Open Course</button>
                      </div>
                    )
                  })}
                </div>

                <h3 style={{ marginTop: '40px' }}>Course Catalog</h3>
                <div className="grid">
                  {courses.filter(c => !enrollments.some(e => e.courseId === c.id && e.studentEmail === currentUser.email)).map(c => (
                    <div key={c.id} className="card">
                      <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>{c.title}</h4>
                      <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Price: {c.price === 0 || currentUser.role === 'unistudent' ? 'Free' : `$${c.price}`}</p>
                      <button className="btn" style={{ width: '100%' }} onClick={() => handleEnroll(c.id, c.price)}>Enroll Now</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* MODAL OVERLAY */}
      {modalType && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal" style={modalType === 'viewCourse' ? { maxWidth: '850px', width: '90%' } : {}}>
            {modalType === 'createCourse' && (
              <form onSubmit={handleCreateCourse}>
                <h3>Create New Course</h3>
                <div className="form-group"><label>Title</label><input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required /></div>
                <div className="form-group"><label>Price ($)</label><input type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} required /></div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setModalType(null)}>Cancel</button>
                  <button type="submit" className="btn">Create</button>
                </div>
              </form>
            )}

            {modalType === 'manageCourse' && activeCourse && (
              <div>
                <h3>Manage: {activeCourse.title}</h3>
                <div className="section-box">
                  <h4>Videos</h4>
                  <ul className="item-list">
                    {activeCourse.videos?.map(v => <li key={v.id}>🔗 <a href={v.url} target="_blank" rel="noreferrer">{v.title}</a></li>)}
                  </ul>
                  <form onSubmit={e => handleAddVideo(e, activeCourse.id)} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <input type="text" placeholder="Video Title" value={vidTitle} onChange={e => setVidTitle(e.target.value)} required />
                    <input type="url" placeholder="Video URL" value={vidUrl} onChange={e => setVidUrl(e.target.value)} required />
                    <button type="submit" className="btn">Add</button>
                  </form>
                </div>
                <div className="section-box">
                  <h4>Assignments</h4>
                  <ul className="item-list">
                    {activeCourse.assignments?.map(a => <li key={a.id}>📝 <b>{a.title}</b><br/><small>{a.desc}</small></li>)}
                  </ul>
                  <form onSubmit={e => handleAddAssignment(e, activeCourse.id)} style={{ marginTop: '10px' }}>
                    <input type="text" placeholder="Assignment Title" value={assTitle} onChange={e => setAssTitle(e.target.value)} required style={{ marginBottom: '8px' }} />
                    <textarea placeholder="Description" value={assDesc} onChange={e => setAssDesc(e.target.value)} required style={{ width: '100%', height: '60px' }}></textarea>
                    <button type="submit" className="btn" style={{ marginTop: '8px' }}>Add Assignment</button>
                  </form>
                </div>
                <button className="btn btn-outline" onClick={() => setModalType(null)}>Done</button>
              </div>
            )}

            {modalType === 'viewCourse' && activeCourse && (
              <div style={{ width: '100%', padding: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eef2f5', paddingBottom: '12px' }}>
                  <h2 style={{ margin: 0, textTransform: 'capitalize', color: '#1e293b', fontSize: '22px' }}>{activeCourse.title}</h2>
                  <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={() => setModalType(null)}>Close</button>
                </div>

                <div style={{
                  display: 'flex',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '10px',
                  padding: '4px',
                  marginBottom: '24px'
                }}>
                  <button
                    type="button"
                    onClick={() => setCourseTab('lessons')}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: courseTab === 'lessons' ? '#ffffff' : 'transparent',
                      color: courseTab === 'lessons' ? 'var(--primary)' : '#64748b',
                      boxShadow: courseTab === 'lessons' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    🎥 Lessons
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseTab('assignments')}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: courseTab === 'assignments' ? '#ffffff' : 'transparent',
                      color: courseTab === 'assignments' ? 'var(--primary)' : '#64748b',
                      boxShadow: courseTab === 'assignments' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    📝 Assignments
                  </button>
                </div>

                <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '5px' }}>
                  
                  {courseTab === 'lessons' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activeCourse.videos && activeCourse.videos.length > 0 ? (
                        activeCourse.videos.map(v => {
                          let embedUrl = v.url;
                          const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                          const match = v.url.match(ytRegex);
                          
                          if (match && match[2].length === 11) {
                            embedUrl = `https://www.youtube.com/embed/${match[2]}`;
                          }
                          
                          return (
                            <div key={v.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', gap: '12px' }}>
                              <h5 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>{v.title}</h5>
                              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '6px', backgroundColor: '#000' }}>
                                <iframe 
                                  src={embedUrl}
                                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title={v.title}
                                ></iframe>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '20px' }}>No videos available for this course.</p>
                      )}
                    </div>
                  )}

                  {courseTab === 'assignments' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {activeCourse.assignments && activeCourse.assignments.length > 0 ? (
                        activeCourse.assignments.map(a => {
                          const sub = submissions.find(s => 
                            (s.assignmentId === a.id || (s as any).assignment_id === a.id) && 
                            (s.studentEmail === currentUser?.email || (s as any).student_email === currentUser?.email)
                          );
                          
                          const mode = subModes[a.id] || 'text';

                          return (
                            <div key={a.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <h5 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>{a.title}</h5>
                                {sub && (
                                  <span className={`badge ${sub.status === 'Graded' ? 'badge-success' : 'badge-pending'}`} style={{ fontSize: '13px', padding: '6px 12px' }}>
                                    {sub.status === 'Pending' ? 'Submitted' : 'Graded'}
                                  </span>
                                )}
                              </div>
                              
                              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '15px', lineHeight: '1.5' }}>{a.desc || a.description}</p>

                              {sub ? (
                                <div style={{ 
                                  padding: '16px', 
                                  backgroundColor: sub.status === 'Graded' ? '#f0fdf4' : '#f8fafc', 
                                  border: `1px solid ${sub.status === 'Graded' ? '#bbf7d0' : '#e2e8f0'}`, 
                                  borderRadius: '8px' 
                                }}>
                                  {sub.status === 'Graded' ? (
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#166534', fontWeight: 600 }}>Score</span>
                                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#15803d' }}>{sub.marks} / 100</span>
                                      </div>
                                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '12px' }}>
                                        <span style={{ fontSize: '13px', color: '#475569', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Instructor Feedback:</span>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontStyle: 'italic', backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                          "{sub.feedback}"
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p style={{ margin: 0, fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                                      ⏳ Submitted and awaiting instructor evaluation.
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <form onSubmit={e => handleSubmitAssignment(e, activeCourse.id, a.id)} style={{ marginTop: '12px' }}>
                                  {/* Mode Switcher: Link/Text vs File */}
                                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setSubModes(prev => ({ ...prev, [a.id]: 'text' }))}
                                      style={{
                                        padding: '6px 12px',
                                        fontSize: '13px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        cursor: 'pointer',
                                        backgroundColor: mode === 'text' ? '#e2e8f0' : '#ffffff',
                                        fontWeight: mode === 'text' ? 'bold' : 'normal'
                                      }}
                                    >
                                      📝 Text or Link
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSubModes(prev => ({ ...prev, [a.id]: 'file' }))}
                                      style={{
                                        padding: '6px 12px',
                                        fontSize: '13px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        cursor: 'pointer',
                                        backgroundColor: mode === 'file' ? '#e2e8f0' : '#ffffff',
                                        fontWeight: mode === 'file' ? 'bold' : 'normal'
                                      }}
                                    >
                                      📁 Attach File
                                    </button>
                                  </div>

                                  {mode === 'file' ? (
                                    <div style={{ marginBottom: '12px' }}>
                                      <input 
                                        type="file" 
                                        onChange={e => handleFileChange(a.id, e.target.files ? e.target.files[0] : null)}
                                        style={{ 
                                          width: '100%', 
                                          padding: '10px', 
                                          borderRadius: '6px', 
                                          border: '1px solid #cbd5e1',
                                          backgroundColor: '#f8fafc',
                                          boxSizing: 'border-box' 
                                        }} 
                                      />
                                    </div>
                                  ) : (
                                    <textarea 
                                      placeholder="Paste submission link (e.g. Google Drive/GitHub) or type response..." 
                                      value={subContents[a.id] || ''} 
                                      onChange={e => {
                                        const text = e.target.value;
                                        setSubContents(prev => ({ ...prev, [a.id]: text }));
                                      }} 
                                      style={{ 
                                        width: '100%', 
                                        minHeight: '90px', 
                                        padding: '12px', 
                                        borderRadius: '6px', 
                                        border: '1px solid #cbd5e1', 
                                        marginBottom: '12px', 
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                  )}

                                  <button type="submit" className="btn" style={{ padding: '10px 20px', fontSize: '14px' }}>
                                    Submit Assignment
                                  </button>
                                </form>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0, textAlign: 'center', padding: '20px' }}>No assignments for this course yet.</p>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )}

            {modalType === 'grade' && activeSubmission && (
              <form onSubmit={handleSaveGrade}>
                <h3>Grade Submission</h3>
                <p style={{ margin: '4px 0 12px 0', fontSize: '15px' }}>
                  <strong>Student:</strong> {activeSubmission.studentName || (activeSubmission as any).student_name || 'Student'}
                </p>
                
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Submitted Work:
                  </label>
                  <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {renderSubmissionContent(activeSubmission.content || (activeSubmission as any).submission_text || (activeSubmission as any).sub_content || '')}
                  </div>
                </div>

                <div className="form-group">
                  <label>Marks (0-100)</label>
                  <input type="number" min="0" max="100" value={gradeMarks} onChange={e => setGradeMarks(Number(e.target.value))} required />
                </div>
                <div className="form-group">
                  <label>Feedback</label>
                  <textarea value={gradeFeedback} onChange={e => setGradeFeedback(e.target.value)} required></textarea>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setModalType(null)}>Cancel</button>
                  <button type="submit" className="btn">Save Grade</button>
                </div>
              </form>
            )}

            {modalType === 'checkout' && activeCourse && (
              <form onSubmit={handleConfirmPayment}>
                <h3>Checkout: {activeCourse.title}</h3>
                <p>Total: <strong>${activeCourse.price}</strong></p>
                <div className="form-group"><label>Card Number</label><input type="text" placeholder="16 Digits" required /></div>
                <button type="submit" className="btn btn-block">Pay & Enroll</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;