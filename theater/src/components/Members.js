import { useState, useEffect } from "react";
import { useStates } from "../services/states";

import { useNotification } from '../services/notifications';

export default function Members() {

    const [clients, setClients] = useState([]);
    const { members, my_details } = useStates();
    const { addNotification } = useNotification();
    const [firstLoad, setFirstLoad] = useState(true);

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
                    className={`flex flex-col items-center justify-center space-y-1 p-2 rounded-lg ${c.ready ? "border-2 border-green-500" : "border-2 border-red-500"
                        }`}
                >
                    <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-lg font-bold">
                        {c.email.trim() === my_details.email.trim() ? "You" : c.name[0]}
                    </div>
                    <span className="text-sm">{c.name}</span>
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