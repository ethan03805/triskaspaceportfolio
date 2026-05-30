import { Header } from "@/components/chrome/Header";
import { Footer } from "@/components/chrome/Footer";
import { Column } from "@/components/chrome/Column";
import { Chat } from "@/components/chat/Chat";

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Column>
          <Chat />
        </Column>
      </main>
      <Footer />
    </>
  );
}
