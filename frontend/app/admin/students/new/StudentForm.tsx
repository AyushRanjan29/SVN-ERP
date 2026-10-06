"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type ClassOption = {
  id: number;
  name: string;
};

type SectionOption = {
  id: number;
  name: string;
  class_id: number;
};

type AcademicYearOption = {
  id: number;
  name: string;
  is_active: boolean;
};

type StudentFormData = {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  admissionDate: string;
  classId: string;
  sectionId: string;
  academicYearId: string;
  rollNumber: string;
};

const initialForm: StudentFormData = {
  admissionNumber: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  phone: "",
  address: "",
  guardianName: "",
  guardianPhone: "",
  admissionDate: new Date().toLocaleDateString("en-CA"),
  classId: "",
  sectionId: "",
  academicYearId: "",
  rollNumber: "",
};

export default function StudentForm() {
  const supabase = createClient();

  const [form, setForm] = useState<StudentFormData>(initialForm);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadOptions() {
      setLoadingOptions(true);
      setError("");

      const [classResult, sectionResult, yearResult] = await Promise.all([
        supabase.from("classes").select("id, name").order("id"),
        supabase.from("sections").select("id, name, class_id").order("id"),
        supabase
          .from("academic_years")
          .select("id, name, is_active")
          .order("start_date", { ascending: false }),
      ]);

      if (classResult.error || sectionResult.error || yearResult.error) {
        setError(
          classResult.error?.message ||
            sectionResult.error?.message ||
            yearResult.error?.message ||
            "Unable to load registration options.",
        );
      } else {
        setClasses((classResult.data ?? []) as ClassOption[]);
        setSections((sectionResult.data ?? []) as SectionOption[]);
        setAcademicYears((yearResult.data ?? []) as AcademicYearOption[]);

        const activeYear = yearResult.data?.find((year) => year.is_active);
        if (activeYear) {
          setForm((prev) => ({
            ...prev,
            academicYearId: String(activeYear.id),
          }));
        }
      }

      setLoadingOptions(false);
    }

    loadOptions();
  }, [supabase]);

  const updateField = (field: keyof StudentFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  const availableSections = sections.filter(
    (section) =>
      classes.find((item) => String(item.id) === form.classId) &&
      section.class_id === Number(form.classId),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.classId || !form.sectionId || !form.academicYearId) {
      setError("Please select a class, section and academic year.");
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;

    if (form.phone && !phoneRegex.test(form.phone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (form.guardianPhone && !phoneRegex.test(form.guardianPhone.trim())) {
      setError("Enter a valid 10-digit guardian mobile number.");
      return;
    }
    setSubmitting(true);

    const { data, error: rpcError } = await supabase.rpc("register_student", {
      p_admission_number: form.admissionNumber.trim(),
      p_first_name: form.firstName.trim(),
      p_class_id: Number(form.classId),
      p_section_id: Number(form.sectionId),
      p_academic_year_id: Number(form.academicYearId),
      p_last_name: form.lastName.trim() || null,
      p_date_of_birth: form.dateOfBirth || null,
      p_gender: form.gender || null,
      p_phone: form.phone.trim() || null,
      p_address: form.address.trim() || null,
      p_guardian_name: form.guardianName.trim() || null,
      p_guardian_phone: form.guardianPhone.trim() || null,
      p_admission_date: form.admissionDate || null,
      p_roll_number: form.rollNumber ? Number(form.rollNumber) : null,
    });

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = data as
      | { student_id: number; enrollment_id: number }[]
      | null;

    if (!result?.length) {
      setError("Registration did not return a confirmation.");
      return;
    }

    setSuccess(
      `Student registered successfully. Student ID: ${result[0].student_id}`,
    );
    setForm(initialForm);
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass = "block text-sm font-medium text-gray-700";

  if (loadingOptions) {
    return (
      <p className="text-sm text-gray-600">Loading registration options...</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Student Information
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Admission Number *
            <input
              className={inputClass}
              value={form.admissionNumber}
              onChange={(e) => updateField("admissionNumber", e.target.value)}
              required
              maxLength={50}
            />
          </label>

          <label className={labelClass}>
            First Name *
            <input
              className={inputClass}
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              required
              maxLength={100}
            />
          </label>

          <label className={labelClass}>
            Last Name
            <input
              className={inputClass}
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              maxLength={100}
            />
          </label>

          <label className={labelClass}>
            Date of Birth
            <input
              type="date"
              className={inputClass}
              value={form.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
            />
          </label>

          <label className={labelClass}>
            Gender
            <select
              className={inputClass}
              value={form.gender}
              onChange={(e) => updateField("gender", e.target.value)}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label className={labelClass}>
            Phone
            <input
              type="tel"
              inputMode="numeric"
              className={inputClass}
              value={form.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                updateField("phone", value);
              }}
              maxLength={10}
              pattern="[6-9][0-9]{9}"
              placeholder="10-digit mobile number"
            />
          </label>

          <label className={`${labelClass} sm:col-span-2`}>
            Address
            <textarea
              className={inputClass}
              rows={3}
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Parent / Guardian Details
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Guardian Name
            <input
              className={inputClass}
              value={form.guardianName}
              onChange={(e) => updateField("guardianName", e.target.value)}
              maxLength={150}
            />
          </label>

          <label className={labelClass}>
            Guardian Phone
            <input
              type="tel"
              inputMode="numeric"
              className={inputClass}
              value={form.guardianPhone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                updateField("guardianPhone", value);
              }}
              maxLength={10}
              pattern="[6-9][0-9]{9}"
              placeholder="10-digit mobile number"
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Academic Enrollment
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Academic Year *
            <select
              className={inputClass}
              value={form.academicYearId}
              onChange={(e) => updateField("academicYearId", e.target.value)}
              required
            >
              <option value="">Select academic year</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {year.is_active ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Class *
            <select
              className={inputClass}
              value={form.classId}
              onChange={(e) => {
                updateField("classId", e.target.value);
                setForm((prev) => ({ ...prev, sectionId: "" }));
              }}
              required
            >
              <option value="">Select class</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Section *
            <select
              className={inputClass}
              value={form.sectionId}
              onChange={(e) => updateField("sectionId", e.target.value)}
              required
              disabled={!form.classId}
            >
              <option value="">Select section</option>
              {availableSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            Roll Number
            <input
              type="number"
              min="1"
              step="1"
              className={inputClass}
              value={form.rollNumber}
              onChange={(e) => updateField("rollNumber", e.target.value)}
            />
          </label>

          <label className={labelClass}>
            Admission Date
            <input
              type="date"
              className={inputClass}
              value={form.admissionDate}
              onChange={(e) => updateField("admissionDate", e.target.value)}
            />
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={
          submitting || classes.length === 0 || academicYears.length === 0
        }
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Registering..." : "Register Student"}
      </button>
    </form>
  );
}
