"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: number;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  admission_date: string | null;
};

type Props = {
  student: Student;
};

export default function EditStudentForm({ student }: Props) {
  const [supabase] = useState(() => createClient());

  const [form, setForm] = useState({
    firstName: student.first_name,
    lastName: student.last_name ?? "",
    dateOfBirth: student.date_of_birth ?? "",
    gender: student.gender ?? "",
    phone: student.phone ?? "",
    address: student.address ?? "",
    guardianName: student.guardian_name ?? "",
    guardianPhone: student.guardian_phone ?? "",
    admissionDate: student.admission_date ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  function handlePhoneChange(field: "phone" | "guardianPhone", value: string) {
    const cleanedValue = value.replace(/\D/g, "").slice(0, 10);

    setForm((current) => ({
      ...current,
      [field]: cleanedValue,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const firstName = form.firstName.trim();
    const phone = form.phone.trim();
    const guardianPhone = form.guardianPhone.trim();

    if (!firstName) {
      setError("First name is required.");
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;

    if (phone && !phoneRegex.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (guardianPhone && !phoneRegex.test(guardianPhone)) {
      setError("Enter a valid 10-digit guardian mobile number.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase
      .from("students")
      .update({
        first_name: firstName,
        last_name: form.lastName.trim() || null,
        date_of_birth: form.dateOfBirth || null,
        gender: form.gender || null,
        phone: phone || null,
        address: form.address.trim() || null,
        guardian_name: form.guardianName.trim() || null,
        guardian_phone: guardianPhone || null,
        admission_date: form.admissionDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", student.id);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Student information updated successfully.");
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="font-semibold text-gray-800">Personal Information</h2>

        <p className="mt-1 text-sm text-gray-500">
          Update the student's personal and guardian details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
        {/* First Name */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            First Name *
          </label>

          <input
            required
            value={form.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="text-sm font-medium text-gray-700">Last Name</label>

          <input
            value={form.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Date of Birth
          </label>

          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => updateField("dateOfBirth", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Gender */}
        <div>
          <label className="text-sm font-medium text-gray-700">Gender</label>

          <select
            value={form.gender}
            onChange={(e) => updateField("gender", e.target.value)}
            className={inputClass}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Student Phone */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Student Phone
          </label>

          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={form.phone}
            onChange={(e) => handlePhoneChange("phone", e.target.value)}
            placeholder="10-digit mobile number"
            className={inputClass}
          />

          <p className="mt-1 text-xs text-gray-500">
            Enter a 10-digit Indian mobile number.
          </p>
        </div>

        {/* Admission Date */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Admission Date
          </label>

          <input
            type="date"
            value={form.admissionDate}
            onChange={(e) => updateField("admissionDate", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Address */}
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-gray-700">Address</label>

          <textarea
            rows={3}
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Guardian Information */}
      <div className="border-y border-gray-200 px-6 py-4">
        <h2 className="font-semibold text-gray-800">Guardian Information</h2>
      </div>

      <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
        {/* Guardian Name */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Guardian Name
          </label>

          <input
            value={form.guardianName}
            onChange={(e) => updateField("guardianName", e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Guardian Phone */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Guardian Phone
          </label>

          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={form.guardianPhone}
            onChange={(e) => handlePhoneChange("guardianPhone", e.target.value)}
            placeholder="10-digit mobile number"
            className={inputClass}
          />

          <p className="mt-1 text-xs text-gray-500">
            Enter a 10-digit Indian mobile number.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="mx-6 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Success */}
      {success && (
        <p
          role="status"
          className="mx-6 mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 px-6 py-4">
        <Link
          href={`/admin/students/${student.id}`}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
