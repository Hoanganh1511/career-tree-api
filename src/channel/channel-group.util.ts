import { ChannelGroup } from '../../generated/prisma/client';
export function toDbGroup(group: string): ChannelGroup {
  return group.toUpperCase() as ChannelGroup;
}

export function toApiGroup(group: ChannelGroup): 'knowledge' | 'tools' {
  return group.toLowerCase() as 'knowledge' | 'tools';
}
