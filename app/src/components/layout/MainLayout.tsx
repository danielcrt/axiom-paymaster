import TopBar from "../ui/TopBar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col w-screen min-h-screen justify-between items-center">
      <TopBar />
      <div className="flex flex-grow w-full justify-center items-center">
        <div className="flex flex-col w-full h-full justify-center items-center gap-4">
          {children}
        </div>
      </div>
    </div>
  )
}