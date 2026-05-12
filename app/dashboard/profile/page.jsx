import { currentUser } from "@/lib/auth";
import { getLatestResume, getProfile } from "@/lib/store";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const user = await currentUser();
  const [profile, resume] = await Promise.all([getProfile(user.id), getLatestResume(user.id)]);

  return (
    <>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <p className="eyebrow">Profile</p>
          <h1>Candidate profile</h1>
          <p>Complete mandatory data before using direct bulk apply or assisted apply.</p>
        </div>
      </div>
      <ProfileForm initialProfile={profile} initialUser={user} initialResume={resume} />
    </>
  );
}
