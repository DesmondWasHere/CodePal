import * as vscode from "vscode";
const fs = require("fs");
import {Utils, OS} from "../../utils/utils";
import {compileFile} from "./compile_solution";
import {runTestsWithTimeout} from "./run_solution";
import {platform} from "os";

export const runTestCases = async function (
    filePath: string
): Promise<void> {
    // Code for running test cases and returning verdict
    console.log(filePath);
    const os = platform() === "linux" ? OS.linux : OS.windows;
    let path = Utils.pathRefine(filePath, os);
    console.log(path);

    if(!fs.existsSync(path)) {
        vscode.window.showErrorMessage("Problem solution file not found.");
        return;
    }

    const lastIndexOfSlash: number = path.lastIndexOf("/");
    const problemFolderPath: string = path.slice(0, lastIndexOfSlash + 1);
    // console.log(problemFolderPath);

    const testsFolderPath = problemFolderPath + "Tests/";

    if (!fs.existsSync(testsFolderPath)) {
      vscode.window.showErrorMessage("Tests not found.");
      // console.log("Tests not found.");
      return;
    }

    try {
      await compileFile(path, testsFolderPath);
    } catch (err) {
      console.log(err);
      return;
    }

    const resultFilePath: string = `${testsFolderPath}result.txt`;

    let i: number = 1;
    let passed: boolean = true;
    while (true) {
        const inputFilePath: string = `${testsFolderPath}input_${i}.txt`;

        if (!fs.existsSync(inputFilePath)) {
          break;
        }

        const outputFilePath: string = `${testsFolderPath}output_${i}.txt`;
        const codeOutputFilePath: string = `${testsFolderPath}code_output_${i}.txt`;
        const stderrFilePath: string = `${testsFolderPath}stderr_${i}.txt`;

        try {
            let runResult = await runTestsWithTimeout(
                path,
                inputFilePath,
                codeOutputFilePath,
                testsFolderPath,
                stderrFilePath,
                os
            );
            if (runResult === "Run time error") {
                return;
            }

            let testResult: boolean = await compareOutputs(
                outputFilePath,
                codeOutputFilePath
            );
            // console.log(testResult);

            let input: string = await readFile(inputFilePath);
            let expectedOutput: string = await readFile(outputFilePath);
            let codeOutput: string = await readFile(codeOutputFilePath);
            let result: string = `Input ${i}: \n${input}\n\nExpected Output : \n${expectedOutput}\n\nObtained Output : \n${codeOutput}\n\n`;
            if (fs.existsSync(stderrFilePath)) {
                let stderr: string = await readFile(stderrFilePath);
                result = `${result}Standard Error : \n${stderr}\n\n`;
            }
            result = result + "________________________________________________________\n\n";
            fs.appendFileSync(resultFilePath, result, (err: any) => {
                if (err) {
                    vscode.window.showErrorMessage("Could not write result.");
                }
            });

            if (!testResult) {
                // console.log(`Test ${i} failed.`);
                const click: string | undefined = await vscode.window.showErrorMessage(
                    `Test ${i} failed`,
                    "Show Result"
                );
                if (click === "Show Result") {
                    vscode.window.showTextDocument(vscode.Uri.file(resultFilePath), {
                        preview: false,
                        viewColumn: vscode.ViewColumn.Beside,
                        preserveFocus: true,
                    });
                }
                passed = false;
            }
        } catch (err) {
            // console.log("Inside catch block of while loop : " + err);
            // Runtime errors also get logged here
            passed = false;
            return;
        }

        i++;
    }

    if (passed === true) {
      const click:
          | string
          | undefined = await vscode.window.showInformationMessage(
          `All test cases passed.`,
          "Show Results"
      );
      if (click === "Show Results") {
          vscode.window.showTextDocument(vscode.Uri.file(resultFilePath), {
              preview: false,
              viewColumn: vscode.ViewColumn.Beside,
              preserveFocus: true,
          });
      }
    }
};

const compareOutputs = async (
    outputFilePath: string,
    codeOutputFilePath: string
): Promise<boolean> => {
    // Code to compare the expected output and the obtained output

    let expectedOutput: string = await readFile(outputFilePath);

    let obtainedOutput: string = await readFile(codeOutputFilePath);

    expectedOutput = refine(expectedOutput);
    obtainedOutput = refine(obtainedOutput);

    // console.log("Expected Output : ");
    // for(let i = 0; i<expectedOutput.length; i++) {
    //     console.log(expectedOutput.charCodeAt(i));
    // }
    // console.log(expectedOutput);
    // console.log("Obtained Output : ");
    // for(let i = 0; i<obtainedOutput.length; i++) {
    //     console.log(obtainedOutput.charCodeAt(i));
    // }
    // console.log(obtainedOutput);

    // console.log(expectedOutput === obtainedOutput);

    if (expectedOutput === obtainedOutput) {
        return true;
    } else {
        return false;
    }
};

const refine = (content: string): string => {
    content = content.trim();
    content = content.replace(/\r/g, "");
    content = content.replace(/ \n/g, "\n");

    return content;
};

const readFile = (filePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, "utf8", (error: any, fileContent: string) => {
            if (error !== null) {
                reject(error);
                return;
            }

            resolve(fileContent);
        });
    });
};
