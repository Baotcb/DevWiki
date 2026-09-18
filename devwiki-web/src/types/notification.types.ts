export type NotificationType =
    | 'DOCUMENT_CREATED'
    | 'DOCUMENT_UPDATED'
    | 'DOCUMENT_OUTDATED'
    | 'DOCUMENT_ATTACHMENT_UPLOADED';

export interface NotificationPayload {
    id: string;
    type: NotificationType;
    message: string;
    documentId: string;
    createdAt: string;
    actorId: string;
}
