"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Assignment = {
  id: number;
  teacherName: string;
  employeeId: string;
  subjectName: string;
  className: string;
  sectionName: string;
  academicYear: string;
};

type Props = {
  assignments: Assignment[];
};

export default function TeacherAssignmentList({ assignments }: Props) {
  const [search, setSearch] = useState("");

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return assignments;
    }

    return assignments.filter((assignment) =>
      [
        assignment.teacherName,
        assignment.employeeId,
        assignment.subjectName,
        assignment.className,
        assignment.sectionName,
        assignment.academicYear,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [assignments, search]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teacher, subject, class..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {filteredAssignments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-gray-900">
              No teacher assignments found.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Add an assignment to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Teacher</th>

                  <th className="px-4 py-3 text-left font-semibold">Subject</th>

                  <th className="px-4 py-3 text-left font-semibold">Class</th>

                  <th className="px-4 py-3 text-left font-semibold">Section</th>

                  <th className="px-4 py-3 text-left font-semibold">
                    Academic Year
                  </th>

                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {assignment.teacherName}
                      </div>

                      <div className="text-xs text-gray-500">
                        {assignment.employeeId}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {assignment.subjectName}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {assignment.className}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {assignment.sectionName}
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {assignment.academicYear}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/teacher-assignments/${assignment.id}/edit`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
