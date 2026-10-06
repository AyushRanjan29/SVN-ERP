"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

type Teacher = {
  id: number;
  employee_id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  qualification: string | null;
  joining_date: string | null;
};

type EditTeacherFormProps = {
  teacher: Teacher;
};

export default function EditTeacherForm({ teacher }: EditTeacherFormProps) {
  const [employeeId, setEmployeeId] = useState(teacher.employee_id);

  const [firstName, setFirstName] = useState(teacher.first_name);

  const [lastName, setLastName] = useState(teacher.last_name ?? "");

  const [phone, setPhone] = useState(teacher.phone ?? "");

  const [email, setEmail] = useState(teacher.email ?? "");

  const [qualification, setQualification] = useState(
    teacher.qualification ?? "",
  );

  const [joiningDate, setJoiningDate] = useState(teacher.joining_date ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!employeeId.trim()) {
      setError("Employee ID is required.");
      return;
    }

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (phone.trim()) {
      const phoneRegex = /^[6-9]\d{9}$/;

      if (!phoneRegex.test(phone.trim())) {
        setError("Enter a valid 10-digit Indian mobile number.");
        return;
      }
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email.trim())) {
        setError("Enter a valid email address.");
        return;
      }
    }

    setSubmitting(true);

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("teachers")
      .update({
        employee_id: employeeId.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        qualification: qualification.trim() || null,
        joining_date: joiningDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teacher.id);

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Teacher details updated successfully.");
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/admin/teachers/${teacher.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Teacher Profile
        </Link>

        <h1 className="mt-3 text-2xl font-bold text-gray-900">Edit Teacher</h1>

        <p className="mt-1 text-sm text-gray-600">
          Update teacher information.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-white p-6 shadow-sm"
      >
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 rounded-lg bg-green-50 p-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>
            Employee ID *
            <input
              className={inputClass}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              maxLength={50}
            />
          </label>

          <label className={labelClass}>
            First Name *
            <input
              className={inputClass}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              maxLength={100}
            />
          </label>

          <label className={labelClass}>
            Last Name
            <input
              className={inputClass}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={100}
            />
          </label>

          <label className={labelClass}>
            Phone
            <input
              type="tel"
              inputMode="numeric"
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={10}
              placeholder="10-digit mobile number"
            />
          </label>

          <label className={labelClass}>
            Email
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={150}
              placeholder="teacher@example.com"
            />
          </label>

          <label className={labelClass}>
            Qualification
            <input
              className={inputClass}
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              maxLength={150}
              placeholder="e.g. B.Ed, M.Sc"
            />
          </label>

          <label className={labelClass}>
            Joining Date
            <input
              type="date"
              className={inputClass}
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>

          <Link
            href={`/admin/teachers/${teacher.id}`}
            className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
