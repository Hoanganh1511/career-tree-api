import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const personas = [
    {
      key: 'halinh',
      googleId: 'seed-halinh-admin',
      email: 'halinh@seed.local',
      name: 'Hà Linh',
      avatarUrl: 'https://i.pravatar.cc/80?u=author-halinh',
    },
    {
      key: 'minhtri',
      googleId: 'seed-minhtri-mentor',
      email: 'minhtri@seed.local',
      name: 'Minh Trí',
      avatarUrl: 'https://i.pravatar.cc/80?u=author-minhtri',
    },
    {
      key: 'quocbao',
      googleId: 'seed-quocbao-mentor',
      email: 'quocbao@seed.local',
      name: 'Quốc Bảo',
      avatarUrl: 'https://i.pravatar.cc/80?u=author-quocbao',
    },
    {
      key: 'thutrang',
      googleId: 'seed-thutrang-member',
      email: 'thutrang@seed.local',
      name: 'Thu Trang',
      avatarUrl: 'https://i.pravatar.cc/80?u=author-thutrang',
    },
  ];

  const users: Record<string, { id: string }> = {};
  for (const p of personas) {
    users[p.key] = await prisma.user.upsert({
      where: { googleId: p.googleId },
      update: {},
      create: {
        googleId: p.googleId,
        email: p.email,
        name: p.name,
        avatarUrl: p.avatarUrl,
        verified: true,
      },
    });
  }

  const community = await prisma.community.upsert({
    where: { slug: 'on-certificate' },
    update: {},
    create: {
      slug: 'on-certificate',
      name: 'Ôn Certificate Community',
      description:
        'Trao đổi chung về hành trình ôn thi và chinh phục chứng chỉ.',
      isPublic: true,
      ownerId: users.halinh.id,
      memberCount: 4,
    },
  });

  const channelDefs = [
    {
      slug: 'general',
      name: 'general',
      description:
        'Trao đổi chung về hành trình ôn thi và chinh phục chứng chỉ.',
    },
    {
      slug: 'aws',
      name: 'aws',
      description: 'Chứng chỉ AWS (Solutions Architect, Developer, SysOps...).',
    },
    { slug: 'azure', name: 'azure', description: 'Chứng chỉ Microsoft Azure.' },
    {
      slug: 'ielts-toeic',
      name: 'ielts-toeic',
      description: 'Ôn thi IELTS/TOEIC.',
    },
    {
      slug: 'mock-interview',
      name: 'mock-interview',
      description: 'Luyện phỏng vấn thử.',
    },
    {
      slug: 'resources',
      name: 'resources',
      description: 'Chia sẻ tài liệu, nguồn học tập và công cụ hữu ích.',
    },
    {
      slug: 'jobs-opportunities',
      name: 'jobs-opportunities',
      description: 'Cơ hội việc làm liên quan tới chứng chỉ.',
    },
  ];
  const channels: Record<string, { id: string }> = {};
  for (const c of channelDefs) {
    channels[c.slug] = await prisma.channel.upsert({
      where: { communityId_slug: { communityId: community.id, slug: c.slug } },
      update: {},
      create: { ...c, communityId: community.id },
    });
  }

  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: users.halinh.id,
      },
    },
    update: {},
    create: {
      communityId: community.id,
      userId: users.halinh.id,
      role: 'OWNER',
      status: 'APPROVED',
      points: 9800,
    },
  });
  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: users.minhtri.id,
      },
    },
    update: {},
    create: {
      communityId: community.id,
      userId: users.minhtri.id,
      role: 'MENTOR',
      status: 'APPROVED',
      points: 12000,
    },
  });
  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: users.quocbao.id,
      },
    },
    update: {},
    create: {
      communityId: community.id,
      userId: users.quocbao.id,
      role: 'MENTOR',
      status: 'APPROVED',
      points: 8200,
    },
  });
  await prisma.communityMember.upsert({
    where: {
      communityId_userId: {
        communityId: community.id,
        userId: users.thutrang.id,
      },
    },
    update: {},
    create: {
      communityId: community.id,
      userId: users.thutrang.id,
      role: 'MEMBER',
      status: 'APPROVED',
      points: 7500,
    },
  });

  const general = channels.general;
  const m0 = await prisma.communityPost.create({
    data: {
      communityId: community.id,
      channelId: general.id,
      authorId: users.minhtri.id,
      category: 'LEARNING',
      title: '🏆 Hoàn thành Learning Node #12',
      content:
        'Hôm nay mình vừa hoàn thành Learning Node về IAM Policy & Security Best Practices.',
      isPinned: true,
      data: {
        bulletPoints: [
          'Hiểu rõ cách viết Resource ARN đúng chuẩn',
          'Áp dụng nguyên tắc Least Privilege khi cấp quyền',
          'Xử lý hiệu quả policy cho nhiều bucket S3',
        ],
        topicTag: 'AWS / IAM / Security',
        actionLabel: 'Hoàn thành Learning Node',
        attachmentName: 'IAM_Security_Cheatsheet.pdf',
        attachmentMeta: '1.8 MB',
      },
    },
  });
  await prisma.comment.create({
    data: {
      postId: m0.id,
      authorId: users.halinh.id,
      content:
        'Mình cũng đang học phần này, phần IAM Policy khá hay. Cảm ơn bạn đã chia sẻ!',
    },
  });
  await prisma.communityPost.update({
    where: { id: m0.id },
    data: { commentsCount: { increment: 1 } },
  });
  for (const [userKey, emoji] of [
    ['halinh', '👍'],
    ['quocbao', '👍'],
    ['thutrang', '💡'],
    ['minhtri', '🔥'],
  ] as const) {
    await prisma.reaction.create({
      data: { userId: users[userKey].id, postId: m0.id, emoji },
    });
  }
  await prisma.communityPost.update({
    where: { id: m0.id },
    data: { likesCount: { increment: 4 } },
  });
  await prisma.channel.update({
    where: { id: general.id },
    data: { messageCount: { increment: 1 } },
  });

  // TODO: lap lai communityPost.create() tuong tu m0 cho m1/m2/m3 (channel
  // general) va cho 4 bai trong channel "resources" - copy nguyen text tu
  // enggo/src/content/series-mock.ts (COMMUNITIES[0]). Moi lan tao xong
  // 1 post nho tang channel.messageCount len 1.

  console.log('Seed community xong:', community.slug);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
