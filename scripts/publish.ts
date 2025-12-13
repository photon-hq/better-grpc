import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN, // Personal Access Token
});

const latestTagResponse = await octokit.rest.repos.listTags({
    owner: "photon-hq",
    repo: "better-grpc",
    per_page: 1,
});

const latestTagCommitSha = (latestTagResponse.data as any)[0].commit.sha;

const latestCommitResponse = await octokit.rest.repos.listCommits({
    owner: "photon-hq",
    repo: "better-grpc",
    per_page: 1,
});

const latestCommitSha = (latestCommitResponse.data as any)[0].sha;

