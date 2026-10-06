"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type TeacherFormData = {
  employeeId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  qualification: string;
  joiningDate: string;
};

const initialForm: TeacherFormData = {
  employeeId: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  qualification: "",
  joiningDate: "",
};

export default function TeacherForm() {
  const [form, setForm] = useState<TeacherFormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (field: keyof TeacherFormData, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.employeeId.trim()) {
      setError("Employee ID is required.");
      return;
    }

    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (form.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;

      if (!phoneRegex.test(form.phone.trim())) {
        setError("Enter a valid 10-digit Indian mobile number.");
        return;
      }
    }

    if (form.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(form.email.trim())) {
        setError("Enter a valid email address.");
        return;
      }
    }

    setSubmitting(true);

    const supabase = createClient();

    const { data, error: insertError } = await supabase
      .from("teachers")
      .insert({
        employee_id: form.employeeId.trim(),
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        qualification: form.qualification.trim() || null,
        joining_date: form.joiningDate || null,
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess(`Teacher added successfully. Teacher ID: ${data.id}`);

    setForm(initialForm);
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          Teacher Information
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Employee ID *
            <input
              className={inputClass}
              value={form.employeeId}
              onChange={(e) => updateField("employeeId", e.target.value)}
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
            Phone
            <input
              type="tel"
              inputMode="numeric"
              className={inputClass}
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              maxLength={10}
              placeholder="10-digit mobile number"
            />
          </label>

          <label className={labelClass}>
            Email
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              maxLength={150}
              placeholder="teacher@example.com"
            />
          </label>

          <label className={labelClass}>
            Qualification
            <input
              className={inputClass}
              value={form.qualification}
              onChange={(e) => updateField("qualification", e.target.value)}
              maxLength={150}
              placeholder="e.g. B.Ed, M.Sc"
            />
          </label>

          <label className={labelClass}>
            Joining Date
            <input
              type="date"
              className={inputClass}
              value={form.joiningDate}
              onChange={(e) => updateField("joiningDate", e.target.value)}
            />
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Adding Teacher..." : "Add Teacher"}
      </button>
    </form>
  );
}
