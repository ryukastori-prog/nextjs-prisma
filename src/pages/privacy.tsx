export default function Privacy() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-indigo-600 text-white px-4 py-4 shadow">
        <h1 className="text-xl font-bold">📚 MangaSync</h1>
        <p className="text-xs text-indigo-100">プライバシーポリシー</p>
      </header>
      <div className="max-w-xl mx-auto p-4 space-y-4 text-sm leading-relaxed">
        <section>
          <h2 className="font-bold">1. 取得する情報</h2>
          <p>
            Google アカウントでログインする際に、メールアドレスのみを取得します。パスワードは取得も保存もしません。
          </p>
        </section>
        <section>
          <h2 className="font-bold">2. 利用目的</h2>
          <p>
            ログインするユーザーを識別し、そのユーザー自身が登録したエピソードやバージョン履歴を表示するためにのみ使用します。
          </p>
        </section>
        <section>
          <h2 className="font-bold">3. 保存するデータ</h2>
          <p>
            ユーザーが入力したエピソード、バージョンの内容は、本人のアカウントにのみ紐づけて保存し、他のユーザーには表示されません。
          </p>
        </section>
        <section>
          <h2 className="font-bold">4. 第三者への提供</h2>
          <p>
            法令に基づく場合を除き、取得した情報を第三者に提供・販売しません。
          </p>
        </section>
        <section>
          <h2 className="font-bold">5. データの削除</h2>
          <p>
            データの削除を希望する場合は、下記の連絡先までご連絡ください。
          </p>
        </section>
        <section>
          <h2 className="font-bold">6. お問い合わせ</h2>
          <p>ryuka.stori@gmail.com</p>
        </section>
        <p className="text-xs text-gray-500">制定日: 2026年11月3日</p>
      </div>
    </main>
  )
}
