"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type Assignment = {
  id: number;
  teacher_id: number;
  subject_id: number;
  class_id: number;
  section_id: number;
  academic_year_id: number;
};

type Props = {
  assignment: Assignment;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassItem[];
  sections: Section[];
  academicYears: AcademicYear[];
  classSubjects: ClassSubject[];
};

export default function EditTeacherAssignmentForm({
  assignment,
  teachers,
  subjects,
  classes,
  sections,
  academicYears,
  classSubjects,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [teacherId, setTeacherId] = useState(String(assignment.teacher_id));

  const [subjectId, setSubjectId] = useState(String(assignment.subject_id));

  const [classId, setClassId] = useState(String(assignment.class_id));

  const [sectionId, setSectionId] = useState(String(assignment.section_id));

  const [academicYearId, setAcademicYearId] = useState(
    String(assignment.academic_year_id),
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredSections = useMemo(() => {
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

          return (
            item.section_id === null || String(item.section_id) === sectionId
          );
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

    setSaving(true);

    const { error: updateError } = await supabase
      .from("teacher_assignments")
      .update({
        teacher_id: Number(teacherId),
        subject_id: Number(subjectId),
        class_id: Number(classId),
        section_id: Number(sectionId),
        academic_year_id: Number(academicYearId),
      })
      .eq("id", assignment.id);

    if (updateError) {
      if (updateError.code === "23505") {
        setError("This teacher assignment already exists.");
      } else {
        setError(updateError.message);
      }

      setSaving(false);
      return;
    }

    setSuccess("Teacher assignment updated successfully.");

    setSaving(false);

    router.refresh();
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this teacher assignment?",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setDeleting(true);

    const { error: deleteError } = await supabase
      .from("teacher_assignments")
      .delete()
      .eq("id", assignment.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.push("/admin/teacher-assignments");
    router.refresh();
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
          Edit Teacher Assignment
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Update the teacher, subject, class, section or academic year.
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">Select section</option>

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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
          >
            <option value="">Select subject</option>

            {availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Assignment"}
          </button>

          <div className="flex gap-3">
            <Link
              href="/admin/teacher-assignments"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || deleting}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Update Assignment"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
