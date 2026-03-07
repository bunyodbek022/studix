import { Global, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtModule } from "@nestjs/jwt";
import PrismaModule from "src/prisma/prisma.module";

@Global()
@Module({
    imports: [PrismaModule],
    controllers: [AuthController],
    providers: [AuthService],
})

export class AuthModule {}