import { DIContainer } from '@science-map/shared';
import { IGraph } from '../types';
export interface IUserRegisteredEvent {
    email: string;
    name: string;
    role: string;
    timestamp: number;
}
export interface IUserLoginEvent {
    userId: string;
    email: string;
    timestamp: number;
}
export interface IGraphRepository {
    createNode(node: unknown): Promise<unknown>;
    getUserGraph(userId: string): Promise<IGraph>;
    updateNodeProperties(nodeId: string, properties: Record<string, unknown>): Promise<void>;
}
export interface IEventProcessor {
    initialize(): Promise<void>;
    processUserRegistered(event: IUserRegisteredEvent): Promise<void>;
    processUserLogin(event: IUserLoginEvent): Promise<void>;
}
export declare class EventProcessor implements IEventProcessor {
    private container;
    private graphRepository?;
    constructor(container: DIContainer, graphRepository?: IGraphRepository | undefined);
    initialize(): Promise<void>;
    processUserRegistered(event: IUserRegisteredEvent): Promise<void>;
    processUserLogin(event: IUserLoginEvent): Promise<void>;
}
//# sourceMappingURL=event-processor.d.ts.map