/** Device-only identity used while Firebase has no signed-in student. */
export const LOCAL_WORKSTATION_STUDENT_ID = 'local-student';

/**
 * Keeps persistence keys stable when a host passes an empty or whitespace-only identity.
 * Routed hosts should normally use `DragonWorkstationContextService.studentId` instead.
 */
export function normalizeWorkstationStudentId(studentId: string | null | undefined): string {
  return studentId?.trim() || LOCAL_WORKSTATION_STUDENT_ID;
}
