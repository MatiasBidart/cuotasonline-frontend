import AccountCompletion from "./page-client";

export default async function CompleteAccountPage({ params }: PageProps<"/crear-cuenta/[token]">) {
  const { token } = await params;
  return <AccountCompletion token={token} />;
}
