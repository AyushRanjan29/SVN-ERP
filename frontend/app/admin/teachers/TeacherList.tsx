"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

type TeacherListProps = {
  teachers: Teacher[];
};

export default function TeacherList({ teachers }: TeacherListProps) {
  const [search, setSearch] = useState("");

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return teachers;
    }

    return teachers.filter((teacher) => {
      const fullName =
        `${teacher.first_name} ${teacher.last_name ?? ""}`.toLowerCase();

      return (
        fullName.includes(query) ||
        teacher.employee_id.toLowerCase().includes(query) ||
        (teacher.phone ?? "").includes(query) ||
        (teacher.email ?? "").toLowerCase().includes(query)
      );
    });
  }, [teachers, search]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700">
          Search Teachers
        </label>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, employee ID, phone or email..."
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Clear search
          </button>
        )}
      </div>

      {/* Results */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <p className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {filteredTeachers.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900">
              {teachers.length}
            </span>{" "}
            teachers
          </p>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-gray-600">
              {teachers.length === 0
                ? "No teachers have been registered yet."
                : "No teachers match your search."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-sm text-gray-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Employee ID</th>
                    <th className="px-5 py-3 font-medium">Teacher</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Qualification</th>
                    <th className="px-5 py-3 font-medium">Joining Date</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        {teacher.employee_id}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {teacher.first_name} {teacher.last_name ?? ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {teacher.phone || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {teacher.email || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {teacher.qualification || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {teacher.joining_date
                          ? new Date(teacher.joining_date).toLocaleDateString(
                              "en-IN",
                            )
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/teachers/${teacher.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          View Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-gray-100 md:hidden">
              {filteredTeachers.map((teacher) => (
                <div key={teacher.id} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {teacher.first_name} {teacher.last_name ?? ""}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Employee ID: {teacher.employee_id}
                      </p>
                    </div>

                    <Link
                      href={`/admin/teachers/${teacher.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                  </div>

                  <div className="mt-4 space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {teacher.phone || "—"}
                    </p>

                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {teacher.email || "—"}
                    </p>

                    <p>
                      <span className="font-medium">Qualification:</span>{" "}
                      {teacher.qualification || "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
