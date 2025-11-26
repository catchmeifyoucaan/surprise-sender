import { AppDataSource } from '../data-source';
import { Phishlet } from '../entities';

class PhishletService {
    async create(phishletData: Partial<Phishlet>): Promise<Phishlet> {
        const phishletRepo = AppDataSource.getRepository(Phishlet);
        const phishlet = phishletRepo.create(phishletData);
        return phishletRepo.save(phishlet);
    }

    async findById(id: string): Promise<Phishlet | null> {
        const phishletRepo = AppDataSource.getRepository(Phishlet);
        return phishletRepo.findOne({ where: { id } });
    }

    async findAll(): Promise<Phishlet[]> {
        const phishletRepo = AppDataSource.getRepository(Phishlet);
        return phishletRepo.find();
    }

    async update(id: string, phishletData: Partial<Phishlet>): Promise<Phishlet | null> {
        const phishletRepo = AppDataSource.getRepository(Phishlet);
        const phishlet = await phishletRepo.findOne({ where: { id } });
        if (!phishlet) {
            return null;
        }
        Object.assign(phishlet, phishletData);
        return phishletRepo.save(phishlet);
    }

    async delete(id: string): Promise<boolean> {
        const phishletRepo = AppDataSource.getRepository(Phishlet);
        const result = await phishletRepo.delete(id);
        return result.affected > 0;
    }
}

export const phishletService = new PhishletService();
