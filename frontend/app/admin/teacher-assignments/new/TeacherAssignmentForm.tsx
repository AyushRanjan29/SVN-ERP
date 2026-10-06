"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Teacher = {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string | null;
};

type Subject = {
  id: number;
  name: string;
};

type ClassItem = {
  id: number;
  name: string;
};

type Section = {
  id: number;
  class_id: number;
  name: string;
};

type AcademicYear = {
  id: number;
  name: string;
};

type ClassSubject = {
  id: number;
  class_id: number;
  subject_id: number;
  section_id: number | null;
};

type Props = {
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassItem[];
  sections: Section[];
  academicYears: AcademicYear[];
  classSubjects: ClassSubject[];
};

export default function TeacherAssignmentForm({
  teachers,
  subjects,
  classes,
  sections,
  academicYears,
  classSubjects,
}: Props) {
  const supabase = createClient();

  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredSections = useMemo(() => {
    if (!classId) {
      return [];
    }

    return sections.filter((section) => String(section.class_id) === classId);
  }, [classId, sections]);

  const availableSubjects = useMemo(() => {
    if (!classId || !sectionId) {
      return [];
    }

    const allowedSubjectIds = new Set(
      classSubjects
        .filter((item) => {
          if (String(item.class_id) !== classId) {
            return false;
          }

          // Class-wide subject
          if (item.section_id === null) {
            return true;
          }

          // Section-specific subject
          return String(item.section_id) === sectionId;
        })
        .map((item) => item.subject_id),
    );

    return subjects.filter((subject) => allowedSubjectIds.has(subject.id));
  }, [classId, sectionId, classSubjects, subjects]);

  const handleClassChange = (value: string) => {
    setClassId(value);
    setSectionId("");
    setSubjectId("");
  };

  const handleSectionChange = (value: string) => {
    setSectionId(value);
    setSubjectId("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!teacherId || !subjectId || !classId || !sectionId || !academicYearId) {
      setError("Please fill in all fields.");
      return;
    }

    const validSubject = classSubjects.some((item) => {
      if (
        String(item.class_id) !== classId ||
        item.subject_id !== Number(subjectId)
      ) {
        return false;
      }

      return item.section_id === null || String(item.section_id) === sectionId;
    });

    if (!validSubject) {
      setError("The selected subject is not assigned to this class/section.");
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase
      .from("teacher_assignments")
      .insert({
        teacher_id: Number(teacherId),
        subject_id: Number(subjectId),
        class_id: Number(classId),
        section_id: Number(sectionId),
        academic_year_id: Number(academicYearId),
      });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("This teacher assignment already exists.");
      } else {
        setError(insertError.message);
      }

      setSubmitting(false);
      return;
    }

    setTeacherId("");
    setSubjectId("");
    setClassId("");
    setSectionId("");
    setAcademicYearId("");

    setSuccess("Teacher assignment created successfully.");

    setSubmitting(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/admin/teacher-assignments"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to Teacher Assignments
        </Link>

        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          Add Teacher Assignment
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Assign a teacher to a subject, class and section.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Teacher */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Teacher
          </label>

          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Select teacher</option>

            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.employee_id} — {teacher.first_name}{" "}
                {teacher.last_name ?? ""}
              </option>
            ))}
          </select>
        </div>

        {/* Academic Year */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Academic Year
          </label>

          <select
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Select academic year</option>

            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>

        {/* Class */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Class
          </label>

          <select
            value={classId}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Select class</option>

            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Section
          </label>

          <select
            value={sectionId}
            onChange={(e) => handleSectionChange(e.target.value)}
            disabled={!classId}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">
              {classId ? "Select section" : "Select class first"}
            </option>

            {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Subject
          </label>

          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={!sectionId}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">
              {!sectionId
                ? "Select section first"
                : availableSubjects.length
                  ? "Select subject"
                  : "No subjects assigned"}
            </option>

            {availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/admin/teacher-assignments"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}
