import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { KnowledgeGroupAccessService } from '../common/knowledge-group-access.service';
import { PostService } from '../post/post.service';

const authorSelect = {
  id: true,
  username: true,
  name: true,
  avatarUrl: true,
  verified: true,
} satisfies Prisma.UserSelect;

type DocWithAuthor = Prisma.DocumentGetPayload<{
  include: { author: { select: typeof authorSelect } };
}>;

// "đ"/"Đ" khong tach duoc qua NFD (chu cai rieng tieng Viet) - thay tay truoc.
function slugify(input: string): string {
  const base = input
    .replace(/đ/gi, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'tai-lieu';
}

@Injectable()
export class DocumentService {
  constructor(
    private prisma: PrismaService,
    private groupAccess: KnowledgeGroupAccessService,
    private postService: PostService,
  ) {}

  // Sinh slug DUY NHAT trong pham vi 1 tac gia: slugify(title) roi them -2,
  // -3... neu trung. Chi xet cua chinh tac gia (2 nguoi khac co the cung slug).
  private async uniqueSlug(authorId: string, title: string): Promise<string> {
    const base = slugify(title);
    const taken = await this.prisma.document.findMany({
      where: { authorId, slug: { startsWith: base } },
      select: { slug: true },
    });
    const set = new Set(taken.map((d) => d.slug));
    if (!set.has(base)) return base;
    let i = 2;
    while (set.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }

  async create(userId: string, dto: CreateDocumentDto) {
    await this.groupAccess.assertGroupWriter(dto.knowledgeGroupId, userId);
    const slug = await this.uniqueSlug(userId, dto.title);
    const doc = await this.prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          authorId: userId,
          knowledgeGroupId: dto.knowledgeGroupId,
          slug,
          title: dto.title,
          summary: dto.summary,
          overview: dto.overview as Prisma.InputJsonValue | undefined,
          coverImageUrl: dto.coverImageUrl,
          content: dto.content as Prisma.InputJsonValue,
          tags: dto.tags ?? [],
          isPublished: dto.isPublished ?? true,
        },
        include: { author: { select: authorSelect } },
      });
      await tx.knowledgeGroup.update({
        where: { id: dto.knowledgeGroupId },
        data: { postCount: { increment: 1 } },
      });
      return created;
    });
    return this.toApi(doc);
  }

  // Danh sach tai lieu cua 1 tac gia (theo username) - nguoi khac chi thay
  // ban da xuat ban (isPublished) VA thuoc nhom PUBLIC (hoac nhom PRIVATE ma
  // viewer la collaborator APPROVED), chinh chu thay het ca ban nhap lan bai
  // trong nhom private. Ghim len dau.
  async listByAuthor(viewerId: string, username: string) {
    const author = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!author) throw new NotFoundException(`User ${username} not found`);
    const isSelf = author.id === viewerId;

    const docs = await this.prisma.document.findMany({
      where: {
        authorId: author.id,
        ...(isSelf ? {} : { isPublished: true }),
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      include: {
        author: { select: authorSelect },
        knowledgeGroup: { select: { visibility: true } },
      },
    });

    const visibleDocs = isSelf
      ? docs
      : await this.filterByGroupVisibility(docs, viewerId);
    return visibleDocs.map((d) => this.toApiSummary(d, isSelf));
  }

  // Danh sach bai viet trong 1 Knowledge Group - duong fetch chinh cho UI
  // drill-down Workspace -> Group. Ban nhap chi hien voi dung tac gia cua no
  // (1 nhom co the co nhieu collaborator, moi nguoi khong thay ban nhap cua
  // nguoi khac).
  async listByGroup(viewerId: string, groupId: string) {
    await this.groupAccess.assertGroupViewable(groupId, viewerId);
    const docs = await this.prisma.document.findMany({
      where: { knowledgeGroupId: groupId },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      include: { author: { select: authorSelect } },
    });
    return docs
      .filter((d) => d.isPublished || d.authorId === viewerId)
      .map((d) => this.toApiSummary(d, d.authorId === viewerId));
  }

  // Loc bot bai thuoc nhom PRIVATE ma viewer khong phai collaborator APPROVED
  // - dung 1 batch query thay vi kiem tung bai rieng.
  private async filterByGroupVisibility<
    T extends {
      knowledgeGroupId: string;
      knowledgeGroup: { visibility: string };
    },
  >(docs: T[], viewerId: string): Promise<T[]> {
    const privateGroupIds = [
      ...new Set(
        docs
          .filter((d) => d.knowledgeGroup.visibility === 'PRIVATE')
          .map((d) => d.knowledgeGroupId),
      ),
    ];
    if (privateGroupIds.length === 0) return docs;
    const collabs = await this.prisma.knowledgeGroupCollaborator.findMany({
      where: {
        groupId: { in: privateGroupIds },
        userId: viewerId,
        status: 'APPROVED',
      },
      select: { groupId: true },
    });
    const approvedGroupIds = new Set(collabs.map((c) => c.groupId));
    return docs.filter(
      (d) =>
        d.knowledgeGroup.visibility === 'PUBLIC' ||
        approvedGroupIds.has(d.knowledgeGroupId),
    );
  }

  // Tra ve null (khong throw) khi khong thay, ban nhap ma nguoi xem khong
  // phai tac gia, HOAC thuoc nhom PRIVATE ma viewer khong phai collaborator
  // APPROVED - de controller tu quyet dinh 404.
  async findBySlug(viewerId: string, username: string, slug: string) {
    const doc = await this.prisma.document.findFirst({
      where: { slug, author: { username } },
      include: {
        author: { select: authorSelect },
        knowledgeGroup: { select: { visibility: true } },
      },
    });
    if (!doc) return null;
    const isSelf = doc.authorId === viewerId;
    if (!doc.isPublished && !isSelf) return null;

    if (doc.knowledgeGroup.visibility === 'PRIVATE' && !isSelf) {
      const collab = await this.groupAccess.getCollaboration(
        doc.knowledgeGroupId,
        viewerId,
      );
      if (!collab || collab.status !== 'APPROVED') return null;
    }

    // Tang luot xem khi NGUOI KHAC doc (khong tinh chinh tac gia).
    if (!isSelf) {
      await this.prisma.document.update({
        where: { id: doc.id },
        data: { viewCount: { increment: 1 } },
      });
      doc.viewCount += 1;
    }
    return this.toApi(doc, isSelf);
  }

  private async assertAuthor(documentId: string, userId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { authorId: true },
    });
    // 404 (khong phai 403) neu khong ton tai HOAC khong phai cua minh - tranh
    // lo su ton tai cua tai lieu ban nhap nguoi khac, dung convention repo.
    if (!doc || doc.authorId !== userId) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
  }

  async update(userId: string, documentId: string, dto: UpdateDocumentDto) {
    await this.assertAuthor(documentId, userId);
    // Slug GIU NGUYEN khi doi tieu de - tranh vo link da chia se; chi doi cac
    // truong noi dung.
    const doc = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        title: dto.title,
        summary: dto.summary,
        overview: dto.overview as Prisma.InputJsonValue | undefined,
        coverImageUrl: dto.coverImageUrl,
        content: dto.content as Prisma.InputJsonValue,
        tags: dto.tags,
        isPublished: dto.isPublished,
      },
      include: { author: { select: authorSelect } },
    });
    return this.toApi(doc, true);
  }

  async remove(userId: string, documentId: string) {
    await this.assertAuthor(documentId, userId);
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.document.delete({ where: { id: documentId } });
      await tx.knowledgeGroup.update({
        where: { id: deleted.knowledgeGroupId },
        data: { postCount: { decrement: 1 } },
      });
    });
  }

  async setPinned(userId: string, documentId: string, isPinned: boolean) {
    await this.assertAuthor(documentId, userId);
    const doc = await this.prisma.document.update({
      where: { id: documentId },
      data: { isPinned },
      include: { author: { select: authorSelect } },
    });
    return this.toApi(doc, true);
  }

  // "Chia se len bang tin" - tao 1 Post THAT trong feed kham pha (khac hoan
  // toan viec chi doi visibility), chi tac gia chia se duoc bai cua chinh
  // minh. `data` chi mang du du lieu de feed render 1 card + link ve lai
  // trang bai viet day du, khong nhan ban sao noi dung (content) vao Post.
  async shareToFeed(userId: string, documentId: string) {
    await this.assertAuthor(documentId, userId);
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { author: { select: authorSelect } },
    });
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

    return this.postService.create(userId, {
      kind: 'workspace-post',
      data: {
        title: doc.title,
        summary: doc.summary ?? undefined,
        coverImageUrl: doc.coverImageUrl ?? undefined,
        authorUsername: doc.author.username ?? doc.author.id,
        slug: doc.slug,
      },
    });
  }

  private toApi(doc: DocWithAuthor, isSelf = false) {
    return {
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      summary: doc.summary,
      overview: doc.overview,
      coverImageUrl: doc.coverImageUrl,
      content: doc.content,
      tags: doc.tags,
      isPinned: doc.isPinned,
      isPublished: doc.isPublished,
      viewCount: doc.viewCount,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      isOwner: isSelf,
      author: {
        username: doc.author.username ?? doc.author.id,
        name: doc.author.name,
        avatarUrl: doc.author.avatarUrl ?? '',
        verified: doc.author.verified,
      },
    };
  }

  // Ban RUT GON cho danh sach - khong keo ca `content` (Tiptap JSON co the
  // rat lon, khong can khi chi hien the).
  private toApiSummary(doc: DocWithAuthor, isSelf: boolean) {
    return {
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      summary: doc.summary,
      overview: doc.overview,
      coverImageUrl: doc.coverImageUrl,
      tags: doc.tags,
      isPinned: doc.isPinned,
      isPublished: doc.isPublished,
      viewCount: doc.viewCount,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      isOwner: isSelf,
      author: {
        username: doc.author.username ?? doc.author.id,
        name: doc.author.name,
        avatarUrl: doc.author.avatarUrl ?? '',
        verified: doc.author.verified,
      },
    };
  }
}
