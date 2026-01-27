import { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { useStates } from "../services/states";
import { useVoiceRoom } from "../services/useVoiveRoom";
import { useNotification } from '../services/notifications';

export default function Members() {

    const [clients, setClients] = useState([]);
    const { members, my_details, remoteStreams } = useStates();
    const { addNotification } = useNotification();
    const [firstLoad, setFirstLoad] = useState(true);

    const { unlockAudio } = useVoiceRoom();

    useEffect(() => {
        if (members.length > 0) {
            const rmme = members.filter(m => m.email !== my_details.email);
            const me = members.find(m => m.email === my_details.email);
            const final = [me, ...rmme];

            // find new joined or leaving member
            const joined = final.filter(client => !clients.map(c => c.email).includes(client.email));
            const left = clients.filter(client => !final.map(f => f.email).includes(client.email));

            // notify user joined
            if (joined.length > 0) {
                if (firstLoad) {
                    setFirstLoad(false);
                    return;
                }
                joined.forEach((join) => {
                    addNotification(joined.indexOf(join), 'User Joined', `${join.name === my_details.name ? "You" : join.name} joined the Theater`, 'success');
                })
            }

            if (left.length > 0) {
                left.forEach((lef) => {
                    addNotification(left.indexOf(lef), 'User Left', `${lef.name} Left the Theater`, 'error');
                })
            }

            setClients(final);
        }
    }, [members, my_details]);

    return (
        <div className="flex gap-4 overflow-y-auto h-full">
            {clients.map((c, i) => (
                <div
                    key={i}
                    id={c.email.trim()}
                    className={`relative w-[100px] flex flex-col items-center justify-center space-y-1 p-2 rounded-lg ${c.ready ? "border-2 border-green-500" : "border-2 border-red-500"
                        }`}
                >
                    <div className="w-12 h-12 rounded-full mt-3 bg-gray-600 flex items-center justify-center text-lg font-bold">
                        {c.email.trim() === my_details.email.trim() ? "You" : c.name[0]}
                    </div>
                    <span className="text-sm">{c.name}</span>

                    {
                        c.email !== my_details.email ? (
                            <>
                                {
                                    c.mic === true ? (
                                        <Volume2
                                            className="absolute top-1 right-2 bg-gray-800 p-1 rounded-full shadow-xl hover:bg-red-500 transition-all duration-300"
                                            size={22}
                                            onClick={() => {
                                                const audio = document.querySelector(`audio[id="${c?.email}"]`);

                                                console.log(audio)
                                                if (!audio) return;

                                                if (!audio.paused) {
                                                    console.log("pasuing audio")
                                                    audio.pause();

                                                    setClients(prev =>
                                                        prev.map(client =>
                                                            client.email === c.email
                                                                ? { ...client, mic: false }
                                                                : client
                                                        )
                                                    );
                                                }
                                            }}
                                        />
                                    ) : (
                                        <VolumeX
                                            className="absolute top-1 right-2 bg-gray-800 p-1 rounded-full shadow-xl hover:bg-green-500 transition-all duration-300"
                                            size={22}
                                            onClick={() => {
                                                const audio = document.querySelector(`audio[id="${c?.email}"]`);

                                                console.log(audio)
                                                if (!audio) return;

                                                if (audio.paused) {
                                                    audio.play();
                                                    setClients(prev =>
                                                        prev.map(client =>
                                                            client.email === c.email
                                                                ? { ...client, mic: true }
                                                                : client
                                                        )
                                                    );
                                                }
                                            }}
                                        />
                                    )
                                }

                                <RemoteAudio
                                    key={c.email}
                                    user={c}
                                    stream={remoteStreams ? remoteStreams[c.email] : null}
                                />
                            </>
                        ) : (
                            ""
                        )
                    }

                    <span
                        className={`text-xs font-semibold ${c.ready ? "text-green-400" : "text-red-400"
                            }`}
                    >
                        {c.ready ? "Ready" : "Not Ready"}
                    </span>
                </div>
            ))}
        </div>
    )
}

function RemoteAudio({ user, stream }) {
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <audio id={user?.email} type="remote" className="" ref={audioRef} autoPlay playsInline />
    );
}