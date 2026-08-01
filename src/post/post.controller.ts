import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('posts')
export class PostController {
  constructor(private postService: PostService) {}

  @Get()
  findAll(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('authorUsername') authorUsername?: string,
    // CSV enum PostCategory (vd "FRONTEND,BACKEND") - chon 1 Topic thi day la
    // mang 1 phan tu, chon ca 1 Knowledge World (chua chon Topic con nao) thi
    // la mang gom tat ca category cua moi Topic trong World do (xem
    // home/page.tsx enggo).
    @Query('category') category?: string,
    // CSV kebab-case (vd "text,image,video") - Content Type ben frontend gom
    // nhieu kind, xem CONTENT_TYPE_KINDS trong post-kind-meta.ts (enggo).
    @Query('kind') kind?: string,
    // CSV slug nhanh nghe nghiep (vd "lap-trinh-web-mobile,ui-ux") - chon 1
    // nhom cha o sidebar thi FE tu gom slug cua moi con trong nhom roi truyen
    // vao day, giong cach ?world= dang gom topic con. Slug dac biet
    // "chia-se-chung" = bai khong gan nganh nghe nao.
    @Query('careerCategory') careerCategory?: string,
    // Slug NHOM CHA - loc theo ca nhom ma khong phai liet ke tung nhanh con.
    // Nhan o backend thay vi de FE tu gom slug con, vi trong App Router
    // layout (noi fetch cay category) khong truyen prop xuong page duoc.
    @Query('careerGroup') careerGroup?: string,
  ) {
    return this.postService.findAll({
      cursor,
      limit: limit ? Number(limit) : undefined,
      authorUsername,
      category: category ? category.split(',') : undefined,
      kind: kind ? kind.split(',') : undefined,
      careerCategory: careerCategory ? careerCategory.split(',') : undefined,
      careerGroup,
    });
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreatePostDto) {
    return this.postService.create(userId, dto);
  }
}
