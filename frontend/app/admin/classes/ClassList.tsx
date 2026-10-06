"use client";

import Link from "next/link";

type ClassItem = {
  id: number;
  name: string;
  description: string | null;
};

type SectionItem = {
  id: number;
  class_id: number;
  name: string;
};

type ClassListProps = {
  classes: ClassItem[];
  sections: SectionItem[];
};

export default function ClassList({ classes, sections }: ClassListProps) {
  return (
    <div className="space-y-4">
      {classes.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-600">No classes found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((classItem) => {
            const classSections = sections.filter(
              (section) => section.class_id === classItem.id,
            );

            return (
              <div
                key={classItem.id}
                className="rounded-xl bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {classItem.name}
                    </h2>

                    {classItem.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {classItem.description}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {classSections.length}{" "}
                    {classSections.length === 1 ? "Section" : "Sections"}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Sections
                  </p>

                  {classSections.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {classSections.map((section) => (
                        <span
                          key={section.id}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-700"
                        >
                          {section.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No sections assigned.
                    </p>
                  )}
                </div>

                <Link
                  href={`/admin/classes/${classItem.id}`}
                  className="mt-5 block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
                >
                  View Class
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
