"use client";

import Link from "next/link";

type ClassData = {
  id: number;
  name: string;
  description: string | null;
};

type SectionItem = {
  id: number;
  class_id: number;
  name: string;
};

type ClassSubject = {
  id: number;
  class_id: number;
  subject_id: number;
  section_id: number | null;
  subjectName: string;
};

type ClassDetailsProps = {
  classData: ClassData;
  sections: SectionItem[];
  classSubjects: ClassSubject[];
};

export default function ClassDetails({
  classData,
  sections,
  classSubjects,
}: ClassDetailsProps) {
  const classWideSubjects = classSubjects.filter(
    (item) => item.section_id === null,
  );

  return (
    <div className="space-y-6">
      {/* Class Summary */}
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Class Information
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Class</p>

            <p className="mt-1 font-medium text-gray-900">{classData.name}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Sections</p>

            <p className="mt-1 font-medium text-gray-900">{sections.length}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Curriculum Assignments</p>

            <p className="mt-1 font-medium text-gray-900">
              {classSubjects.length}
            </p>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Sections</h2>

        {sections.length === 0 ? (
          <p className="text-sm text-gray-500">No sections found.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((section) => {
              const sectionSubjects = classSubjects.filter(
                (item) => item.section_id === section.id,
              );

              return (
                <Link
                  key={section.id}
                  href={`/admin/classes/${classData.id}/sections/${section.id}`}
                  className="rounded-lg border border-gray-200 p-4 transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-900">
                      Section {section.name}
                    </h3>

                    <span className="text-sm text-blue-600">View →</span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    {sectionSubjects.length} section-specific subject
                    assignments
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Class-wide Subjects */}
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Class-wide Subjects
        </h2>

        {classWideSubjects.length === 0 ? (
          <p className="text-sm text-gray-500">
            No class-wide subjects assigned.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {classWideSubjects.map((item) => (
              <span
                key={item.id}
                className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
              >
                {item.subjectName}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Section-specific Subjects */}
      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Section-specific Subjects
        </h2>

        {sections.length === 0 ? (
          <p className="text-sm text-gray-500">No sections found.</p>
        ) : (
          <div className="space-y-5">
            {sections.map((section) => {
              const sectionSubjects = classSubjects.filter(
                (item) => item.section_id === section.id,
              );

              return (
                <div
                  key={section.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <h3 className="font-semibold text-gray-900">
                    Section {section.name}
                  </h3>

                  {sectionSubjects.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">
                      No section-specific subjects.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sectionSubjects.map((item) => (
                        <span
                          key={item.id}
                          className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700"
                        >
                          {item.subjectName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
