import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import PrismaService from "src/prisma/prisma.service";
import { hashPassword } from "src/common/config/bcrypt";

@Injectable()
export class UserSeeder implements OnModuleInit {
    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        const existUser = await this.prisma.user.findFirst({
            where: {
                email: "gulomjonovbumyodbek60@gmail.com"
            }
        })
        if (!existUser) {
            await this.prisma.user.create({
                data: {
                    fullName: "Bunyodbek",
                    email: "gulomjonovbunyodbek60@gmail.com",
                    password: await hashPassword("12345678"),
                    role: "SUPERADMIN",
                    position: "Full-Stack",
                    hire_date: new Date("2026-01-01")
                }
            })

            Logger.log("✅ SuperAdmin created")
        }
        Logger.log("✅ SuperAdmin already exist")
    }
}