import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import type { NotificationPayload } from './notification.types';

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true,
    },
})
export class NotificationGateway implements OnGatewayConnection {
    @WebSocketServer()
    private server!: Server;

    constructor(private readonly jwtService: JwtService) { }

    handleConnection(client: Socket): void {
        const token = this.getToken(client);
        if (!token) {
            client.disconnect(true);
            return;
        }

        try {
            const payload = this.jwtService.verify<JwtPayload>(token, {
                secret: process.env.JWT_SECRET,
            });
            client.data.user = payload;
        } catch {
            client.disconnect(true);
        }
    }

    notify(payload: NotificationPayload): void {
        this.server.emit('notification', payload);
    }

    @SubscribeMessage('notifications:ping')
    handlePing(@ConnectedSocket() client: Socket, @MessageBody() message?: unknown) {
        if (!client.data.user) throw new UnauthorizedException();
        return { event: 'notifications:pong', data: message ?? null };
    }

    private getToken(client: Socket): string | undefined {
        const authToken = client.handshake.auth?.token;
        if (typeof authToken === 'string' && authToken) return authToken.replace(/^Bearer\s+/i, '');

        const authorization = client.handshake.headers.authorization;
        return authorization?.replace(/^Bearer\s+/i, '');
    }
}
