const core = require('@actions/core')
const exec = require('@actions/exec')

async function main() {
    try {
        const token = core.getInput("token")
        const directory = core.getInput("directory")
        const remote = core.getInput("remote", { required: true })
        const branch = core.getInput("branch", { required: true })
        const tries = core.getInput("tries", { required: true })

        // Change directory.
        if (directory) {
            process.chdir(directory)
        }

        // Set up token authentication for pushing.
        // Command taken from actions/checkout.
        if (token) {
            const credentials = Buffer.from(`x-access-token:${token}`, 'utf8').toString('base64')
            core.setSecret(credentials)
            await exec.exec("git", ["config", "--local", "http.https://github.com/.extraheader", `AUTHORIZATION: basic ${credentials}`])
        }

        // Checkout the branch which should be pushed.
        await exec.exec("git", ["checkout", branch])

        // Loop specified number of tries.
        for (let i = 0; i < tries; i++) {
            try {
                // Try to push, if successful, then checkout previous branch and just exit.
                await exec.exec("git", ["push", remote, branch])
                await exec.exec("git", ["checkout", "-"])
                return
            } catch (error) {
                // Push failed. Wait some time, pull changes with rebasing and try again.
                const delay = Math.floor(Math.random() * (10 + i)) + 3
                await exec.exec("sleep", [delay])
                await exec.exec("git", ["pull", "--rebase", remote, branch])
            }
        }

        // This should never be reached.
        throw new Error("Max tries reached")
    } catch (error) {
        core.setFailed(error.message)
    }
}

main()
