import Navbar from "~/components/Navbar";
import { type FormEvent, useState } from "react";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "../../lib/puter";
import { convertPdfToImage } from "../../lib/pdf2img";
import { generateUUID } from "../../lib/utils";
import { prepareInstructions } from "../../constants";
import { useNavigate } from "react-router";

const Upload = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const navigate = useNavigate();

  const handleFileSelect = (newFile: File | null) => {
    setFile(newFile);
  };

  const handleAnalyze = async ({
    companyName,
    jobDescription,
    jobTitle,
    file,
  }: {
    companyName: string;
    jobDescription: string;
    jobTitle: string;
    file: File;
  }) => {
    setIsProcessing(true);
    setStatusText("Uploading the file");

    const uploadedFile = await fs.upload([file]);
    if (!uploadedFile) return setStatusText("Error:Failed to upload file.");

    setStatusText("Converting to image..");
    const imageFile = await convertPdfToImage(file);
    if (!imageFile.file)
      return setStatusText("Error:Failed to convert PDF to image.");

    setStatusText("Uploading the image..");
    const uploadedImage = await fs.upload([imageFile.file]);
    if (!uploadedImage) return setStatusText("Error:Failed to upload image.");

    setStatusText("Preparing data..");

    const uuid = generateUUID();
    const data = {
      id: uuid,
      resumePath: uploadedFile.path,
      imagePath: uploadedImage.path,
      companyName,
      jobDescription,
      jobTitle,
      feedback: "",
    };

    await kv.set(`resume:${uuid}`, JSON.stringify(data));

    setStatusText("Analyzing...");
    const feedback = await ai.feedback(
      uploadedFile.path,
      prepareInstructions({ jobTitle, jobDescription }),
    );

    if (!feedback) return setStatusText("Error: Failed to analyze resume.");

    const feedbackText =
      typeof feedback.message.content === "string"
        ? feedback.message.content
        : feedback.message.content[0].text;

    data.feedback = JSON.parse(feedbackText);
    await kv.set(`resume:${uuid}`, JSON.stringify(data));
    setStatusText("Analyzing complete, redirecting...");

    navigate(`/resume/${uuid}`);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest("form");
    if (!form) return;

    const formData = new FormData(form);

    const companyName = formData.get("company-name") as string;
    const jobDescription = formData.get("job-description") as string;
    const jobTitle = formData.get("job-title") as string;

    if (!file) return;

    handleAnalyze({ companyName, jobDescription, jobTitle, file });
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream</h1>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img
                src="/images/resume-scan.gif"
                className="w-full"
                alt={"Scanning resume"}
              />
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement</h2>
          )}
          {!isProcessing && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="Company Name"
                  id="company-name"
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="Job Titile"
                  id="job-title"
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">Job Description</label>
                <textarea
                  rows={5}
                  name="job-description"
                  placeholder="Job Description"
                  id="job-description"
                />
              </div>
              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>

              <button className="primary-button" type="submit">
                Submit
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};
export default Upload;
