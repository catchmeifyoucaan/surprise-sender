import { parentPort, workerData } from 'worker_threads';
import * as fs from 'fs';
import * as csv from 'csv-parse';
import * as ExcelJS from 'exceljs';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);

interface FileData {
    email: string;
    name?: string;
    [key: string]: any;
}

interface WorkerInput {
    filePath: string;
    fileType: '.csv' | '.xlsx' | '.xls' | '.txt';
}

interface WorkerOutput {
    success: boolean;
    data?: FileData[];
    error?: string;
}

async function processCsvFile(filePath: string): Promise<FileData[]> {
    const fileContent = await readFileAsync(filePath, 'utf-8');
    return new Promise((resolve, reject) => {
        csv.parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        }, (err: Error | undefined, data: FileData[]) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
}

async function processExcelFile(filePath: string): Promise<FileData[]> {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.worksheets[0];
        const data: FileData[] = [];
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Skip header row
                const rowData: any = {};
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const headerCell = worksheet.getRow(1).getCell(colNumber);
                    rowData[headerCell.value as string] = cell.value;
                });
                data.push(rowData);
            }
        });
        return data;
    } catch (error) {
        throw new Error(`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function processTxtFile(filePath: string): Promise<FileData[]> {
    try {
        const content = await readFileAsync(filePath, 'utf-8');
        return content.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                const [email, ...nameParts] = line.split(/[,;|]/).map(part => part.trim());
                return {
                    email,
                    name: nameParts.join(' ')
                };
            });
    } catch (error) {
        throw new Error(`Failed to process text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function processFile(input: WorkerInput): Promise<WorkerOutput> {
    try {
        let data: FileData[] = [];

        switch (input.fileType) {
            case '.csv':
                data = await processCsvFile(input.filePath);
                break;
            case '.xlsx':
            case '.xls':
                data = await processExcelFile(input.filePath);
                break;
            case '.txt':
                data = await processTxtFile(input.filePath);
                break;
            default:
                throw new Error('Unsupported file type');
        }

        return { success: true, data };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during file processing'
        };
    }
}

// Main worker logic
if (parentPort) {
    processFile(workerData as WorkerInput)
        .then(result => {
            parentPort!.postMessage(result);
        })
        .catch(error => {
            parentPort!.postMessage({
                success: false,
                error: error instanceof Error ? error.message : 'Worker error'
            });
        });
}
