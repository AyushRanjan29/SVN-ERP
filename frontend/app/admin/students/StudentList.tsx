"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type StudentRow = {
  id: number;
  admissionNumber: string;
  firstName: string;
  lastName: string | null;
  gender: string | null;
  phone: string | null;
  classId: number | null;
  className: string;
  sectionId: number | null;
  sectionName: string;
  rollNumber: number | null;
  academicYear: string;
  status: string;
};

type ClassOption = {
  id: number;
  name: string;
};

type SectionOption = {
  id: number;
  name: string;
  class_id: number;
};

type Props = {
  students: StudentRow[];
  classes: ClassOption[];
  sections: SectionOption[];
};

export default function StudentList({ students, classes, sections }: Props) {
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const availableSections = sections.filter(
    (section) => section.class_id === Number(selectedClass),
  );

  const filteredStudents = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return students.filter((student) => {
      const fullName =
        `${student.firstName} ${student.lastName ?? ""}`.toLowerCase();

      const matchesSearch =
        !searchText ||
        fullName.includes(searchText) ||
        student.admissionNumber.toLowerCase().includes(searchText);

      const matchesClass =
        !selectedClass || student.classId === Number(selectedClass);

      const matchesSection =
        !selectedSection || student.sectionId === Number(selectedSection);

      return matchesSearch && matchesClass && matchesSection;
    });
  }, [students, search, selectedClass, selectedSection]);

  function resetFilters() {
    setSearch("");
    setSelectedClass("");
    setSelectedSection("");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-4">
        <h2 className="font-semibold text-gray-800">Registered Students</h2>
        <span className="text-sm text-gray-500">
          Showing {filteredStudents.length} of {students.length} students
        </span>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-5 md:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          placeholder="Search name or admission no."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <select
          value={selectedClass}
          onChange={(event) => {
            setSelectedClass(event.target.value);
            setSelectedSection("");
          }}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All Classes</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          value={selectedSection}
          onChange={(event) => setSelectedSection(event.target.value)}
          disabled={!selectedClass}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="">All Sections</option>
          {availableSections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          Reset Filters
        </button>
      </div>

      {/* Student Table */}
      {filteredStudents.length === 0 ? (
        <div className="p-10 text-center">
          <p className="font-medium text-gray-700">No students found</p>
          <p className="mt-1 text-sm text-gray-500">
            Try changing your search or filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="whitespace-nowrap px-5 py-3">Admission No.</th>
                <th className="whitespace-nowrap px-5 py-3">Student Name</th>
                <th className="px-5 py-3">Gender</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Section</th>
                <th className="px-5 py-3">Roll No.</th>
                <th className="whitespace-nowrap px-5 py-3">Academic Year</th>
                <th className="px-5 py-3">Status</th>
                <th className="whitespace-nowrap px-5 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-800">
                    {student.admissionNumber}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-800">
                    {student.firstName} {student.lastName ?? ""}
                  </td>
                  <td className="px-5 py-4 capitalize text-gray-600">
                    {student.gender ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {student.className}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {student.sectionName}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {student.rollNumber ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                    {student.academicYear}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium capitalize text-green-700">
                      {student.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
