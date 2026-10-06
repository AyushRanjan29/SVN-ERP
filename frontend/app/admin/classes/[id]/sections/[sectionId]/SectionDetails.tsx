"use client";

import Link from "next/link";

type ClassData = {
  id: number;
  name: string;
};

type Section = {
  id: number;
  class_id: number;
  name: string;
};

type Assignment = {
  id: number;
  subjectId: number;
  subjectName: string;
};

type SectionDetailsProps = {
  classData: ClassData;
  section: Section;
  assignments: Assignment[];
};

export default function SectionDetails({
  classData,
  section,
  assignments,
}: SectionDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Section Information */}
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Section Information
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Class</p>

            <p className="mt-1 font-medium text-gray-900">{classData.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Section</p>

            <p className="mt-1 font-medium text-gray-900">{section.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Subjects</p>

            <p className="mt-1 font-medium text-gray-900">
              {assignments.length}
            </p>
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Subjects</h2>

            <p className="mt-1 text-sm text-gray-500">
              Subjects assigned to Section {section.name}.
            </p>
          </div>

          <span className="rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700">
            {assignments.length}{" "}
            {assignments.length === 1 ? "Subject" : "Subjects"}
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-500">
              No subjects are assigned to this section.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment, index) => (
              <div
                key={assignment.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {index + 1}
                  </span>

                  <div>
                    <p className="font-medium text-gray-900">
                      {assignment.subjectName}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Subject ID: {assignment.subjectId}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Navigation */}
      <div>
        <Link
          href={`/admin/classes/${classData.id}`}
          className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back to Class Details
        </Link>
      </div>
    </div>
  );
}
